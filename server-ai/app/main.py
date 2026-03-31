import json
import logging
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal, Optional

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

from app.database import execute, fetch_all, fetch_one
from app.gemini_client import (
    configure,
    embed_texts_batch,
    generate_json_from_prompt,
    generate_text,
)
from app.hybrid_recommend import hybrid_recommend
from app.ontology_loader import ontology_cache

load_dotenv()

logger = logging.getLogger("factorylink.ai")

# Gemini 임베딩 모델 (짧은 이름 또는 models/… 전체 이름)
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure()
    try:
        ontology_cache.load_from_db()
        logger.info("온톨로지 캐시 로드 완료: %s 건", len(ontology_cache.edges()))
    except Exception as e:
        logger.warning("온톨로지 로드 실패(테이블 미생성 가능): %s", e)
    yield


app = FastAPI(title="Factory-Link AI Service", lifespan=lifespan)
vectorizer = TfidfVectorizer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _pdf_dir() -> Path:
    d = Path(os.getenv("PDF_OUTPUT_DIR", "")).expanduser()
    if str(d).strip():
        d.mkdir(parents=True, exist_ok=True)
        return d
    base = Path(os.getenv("TEMP", os.getenv("TMP", "/tmp")))
    out = base / "factorylink_pdfs"
    out.mkdir(parents=True, exist_ok=True)
    return out


# ---------------------------------------------------------------------------
# 기존 모델·엔드포인트
# ---------------------------------------------------------------------------


class PartAnalysisRequest(BaseModel):
    parts: list[str]


class ContractRequest(BaseModel):
    buyer_name: str
    seller_name: str
    part_name: str
    quantity: int
    unit_price: float


class PartIn(BaseModel):
    id: int
    name: str
    category: str
    unit_price: float
    stock_quantity: int
    region: Optional[str] = None
    company_id: int


class RecommendPartsRequest(BaseModel):
    parts: list[PartIn]
    user_preference: Literal["price_asc", "price_desc", "stock_desc"]
    region_filter: Optional[str] = None


class GenerateContractApiRequest(BaseModel):
    part_name: str
    quantity: int
    unit_price: float
    buyer_name: str
    seller_name: str
    special_conditions: str = "없음"


@app.get("/health")
def health():
    return {"status": "ok", "service": "factory-link-ai"}


@app.post("/analyze/parts")
def analyze_parts(payload: PartAnalysisRequest):
    if len(payload.parts) < 2:
        return {"message": "At least two parts are required for similarity analysis.", "scores": []}

    tfidf_matrix = vectorizer.fit_transform(payload.parts)
    similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)

    return {
        "message": "Parts analysis completed.",
        "scores": similarity_matrix.tolist(),
    }


@app.post("/contract/generate")
def generate_contract(payload: ContractRequest):
    prompt = (
        "Generate a concise B2B manufacturing supply contract with legal tone. "
        f"Buyer: {payload.buyer_name}, Seller: {payload.seller_name}, "
        f"Part: {payload.part_name}, Quantity: {payload.quantity}, Unit Price: {payload.unit_price}."
    )
    try:
        text = generate_text(prompt, temperature=0.4, max_output_tokens=4096)
        return {"content": text, "source": "gemini"}
    except Exception as e:
        logger.warning("contract/generate: %s", e)
        return {
            "content": (
                f"This contract is made between {payload.buyer_name} and {payload.seller_name} "
                f"for {payload.quantity} units of {payload.part_name} at {payload.unit_price} per unit."
            ),
            "source": "fallback-template",
        }


def _reason_for_rank(rank: int, preference: str) -> str:
    if rank >= 3:
        return "추천 매칭"
    if preference == "price_asc":
        labels = ["최저가 옵션", "저렴한 대안", "가격 경쟁력"]
    elif preference == "price_desc":
        labels = ["고가 프리미엄", "프리미엄 옵션", "고단가 우수"]
    else:
        labels = ["재고 풍부", "재고 안정", "물량 여유"]
    return labels[rank]


@app.post("/api/recommend-parts")
def recommend_parts(payload: RecommendPartsRequest):
    try:
        items: list[dict[str, Any]] = [p.model_dump() for p in payload.parts]
        if payload.region_filter:
            items = [x for x in items if x.get("region") == payload.region_filter]
        if not items:
            return {"success": True, "data": [], "message": "추천 완료"}

        prices = np.array([[float(x["unit_price"]), float(x["stock_quantity"])] for x in items])
        scaler = MinMaxScaler()
        norm = scaler.fit_transform(prices)
        scores: list[float] = []
        for i in range(norm.shape[0]):
            np_price, np_stock = float(norm[i][0]), float(norm[i][1])
            if payload.user_preference == "price_asc":
                s = 1.0 - np_price
            elif payload.user_preference == "price_desc":
                s = np_price
            else:
                s = np_stock
            scores.append(float(s))

        ranked = sorted(zip(items, scores), key=lambda t: t[1], reverse=True)[:10]
        out: list[dict[str, Any]] = []
        for idx, (row, sc) in enumerate(ranked):
            enriched = dict(row)
            enriched["score"] = round(sc, 6)
            enriched["recommendation_reason"] = _reason_for_rank(idx, payload.user_preference)
            out.append(enriched)

        return {"success": True, "data": out, "message": "추천 완료"}
    except Exception:
        return {"success": False, "data": [], "message": "추천 처리 중 오류가 발생했습니다."}


@app.post("/api/generate-contract")
def generate_contract_api(payload: GenerateContractApiRequest):
    fallback = "계약서 자동 생성에 실패했습니다. 조건을 확인 후 다시 시도해 주세요."
    system_prompt = (
        "You are a Korean B2B contract specialist. Generate formal Korean manufacturing supply contracts."
    )
    user_prompt = (
        f"품목명: {payload.part_name}\n"
        f"수량: {payload.quantity}\n"
        f"단가: {payload.unit_price}\n"
        f"매수인(바이어): {payload.buyer_name}\n"
        f"매도인(셀러): {payload.seller_name}\n"
        f"특약: {payload.special_conditions}\n\n"
        "다음 조항 제목을 반드시 포함하여 한국어로 정식 계약서 전문을 작성하세요:\n"
        "제1조(목적), 제2조(공급 품목 및 수량), 제3조(대금 및 결제 조건), "
        "제4조(납품 조건 및 일정), 제5조(품질 보증), 제6조(계약 해지 및 분쟁 해결)"
    )

    try:
        text = generate_text(
            user_prompt,
            system_instruction=system_prompt,
            temperature=0.3,
            max_output_tokens=4096,
        )
        if not text:
            text = fallback
        return {"success": True, "data": {"contract_text": text}, "message": "계약서 생성 완료"}
    except Exception:
        return {
            "success": True,
            "data": {"contract_text": fallback},
            "message": "계약서 생성 완료",
        }


# Spring AiSimilarityService 호환
class SimilarityCompanyCandidate(BaseModel):
    id: int
    text: str


class SimilarityCompaniesRequest(BaseModel):
    anchor_text: str
    candidates: list[SimilarityCompanyCandidate]


@app.post("/api/similarity/companies")
def similarity_companies(payload: SimilarityCompaniesRequest):
    try:
        texts = [payload.anchor_text] + [c.text for c in payload.candidates]
        mat = embed_texts_batch(texts, EMBEDDING_MODEL, task_type="semantic_similarity")
        anchor = mat[0:1]
        out = []
        for i, c in enumerate(payload.candidates):
            sim = float(cosine_similarity(anchor, mat[i + 1 : i + 2])[0][0])
            score = int(round(max(0, min(100, sim * 100))))
            out.append({"id": c.id, "score": score})
        return {"success": True, "data": out, "message": "OK"}
    except Exception as e:
        logger.exception("similarity_companies: %s", e)
        return {"success": False, "data": [], "message": str(e)}


# ---------------------------------------------------------------------------
# 신규: 하이브리드 추천·피드백·견적·계약·PDF
# ---------------------------------------------------------------------------


class RecommendRequest(BaseModel):
    query_items: list[str] = Field(..., min_length=1)
    query_company_id: int
    region: Optional[str] = None
    top_k: int = 10


@app.post("/ai/recommend")
def ai_recommend(body: RecommendRequest):
    try:
        parts_rows = fetch_all(
            """
            SELECT p.id, p.company_id, p.name, p.category, p.description, p.region
            FROM parts p
            WHERE p.company_id <> %s
            """,
            (body.query_company_id,),
        )
        if not parts_rows:
            return []

        comps = fetch_all(
            """
            SELECT id, name, region, address FROM companies
            WHERE id <> %s
            """,
            (body.query_company_id,),
        )
        companies: dict[int, dict[str, Any]] = {int(r["id"]): dict(r) for r in comps}

        return hybrid_recommend(
            EMBEDDING_MODEL,
            ontology_cache,
            body.query_items,
            body.query_company_id,
            body.region,
            body.top_k,
            [dict(r) for r in parts_rows],
            companies,
        )
    except Exception as e:
        logger.exception("ai_recommend")
        raise HTTPException(status_code=500, detail=f"추천 처리 중 오류: {e}") from e


class FeedbackRequest(BaseModel):
    query_company_id: int
    recommended_company_id: int
    score: Optional[float] = None
    action: Literal["viewed", "chat_started", "quote_sent", "contract_signed"]


@app.post("/ai/feedback")
def ai_feedback(body: FeedbackRequest):
    try:
        execute(
            """
            INSERT INTO recommendation_feedback
              (query_company_id, recommended_company_id, score, action)
            VALUES (%s, %s, %s, %s)
            """,
            (
                body.query_company_id,
                body.recommended_company_id,
                body.score,
                body.action,
            ),
        )
        return {"ok": True}
    except Exception as e:
        logger.exception("ai_feedback")
        raise HTTPException(status_code=500, detail=f"피드백 저장 실패: {e}") from e


class ParseRequirementsRequest(BaseModel):
    raw_input: str


@app.post("/ai/parse-requirements")
def ai_parse_requirements(body: ParseRequirementsRequest):
    try:
        samples = fetch_all(
            """
            SELECT DISTINCT TRIM(name) AS n FROM parts WHERE name IS NOT NULL AND TRIM(name) <> ''
            LIMIT 500
            """
        )
        sample_names = [r["n"] for r in samples if r.get("n")]
        sample_cat = fetch_all(
            """
            SELECT DISTINCT TRIM(category) AS c FROM parts
            WHERE category IS NOT NULL AND TRIM(category) <> ''
            LIMIT 200
            """
        )
        cats = [r["c"] for r in sample_cat if r.get("c")]
        prompt = (
            "다음은 제조 B2B 견적 요청 문장입니다. JSON만 출력하세요.\n"
            "스키마: {\n"
            '  "items": [{"name": str, "quantity": number|null, "unit": str|null, '
            '"unit_price": number|null, "amount": number|null}],\n'
            '  "deadline_days": number|null,\n'
            '  "budget_krw": number|null,\n'
            '  "extracted_keywords": [str]\n'
            "}\n"
            f"참고 품목명 예시(실제 DB와 유사하게 정규화): {json.dumps(sample_names[:80], ensure_ascii=False)}\n"
            f"참고 카테고리: {json.dumps(cats[:40], ensure_ascii=False)}\n"
            f"입력: {body.raw_input}\n"
        )
        data = generate_json_from_prompt(prompt, temperature=0.2)
        return data
    except Exception as e:
        logger.exception("parse-requirements")
        raise HTTPException(status_code=500, detail=f"요구사항 분석 실패: {e}") from e


class QuoteLine(BaseModel):
    part_id: Optional[int] = None
    name: str
    quantity: int = 0
    unit: str = "개"
    unit_price: float = 0
    amount: float = 0


class GenerateQuoteRequest(BaseModel):
    requester_company_id: int
    target_company_id: int
    items: list[QuoteLine]
    deadline: Optional[str] = None
    valid_until: Optional[str] = None
    notes: str = ""


def _render_quote_html(
    req_name: str,
    req_addr: str,
    req_bn: str,
    req_phone: str,
    tgt_name: str,
    tgt_addr: str,
    tgt_bn: str,
    tgt_phone: str,
    items: list[dict],
    total: float,
    deadline: Optional[str],
    valid_until: Optional[str],
    notes: str,
) -> str:
    rows = ""
    for it in items:
        rows += (
            f"<tr><td>{it.get('name','')}</td><td>{it.get('quantity')}</td>"
            f"<td>{it.get('unit')}</td><td>{it.get('unit_price')}</td>"
            f"<td>{it.get('amount')}</td></tr>"
        )
    return f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap" rel="stylesheet"/>
<style>
body {{ font-family: 'Nanum Gothic', sans-serif; padding: 24px; }}
h1 {{ font-size: 20px; }}
table {{ border-collapse: collapse; width: 100%; margin-top: 16px; }}
th, td {{ border: 1px solid #333; padding: 8px; font-size: 12px; }}
</style></head><body>
<h1>견 적 서</h1>
<p><b>발주처</b> {req_name} / 사업자번호 {req_bn} / {req_addr} / {req_phone}</p>
<p><b>공급처</b> {tgt_name} / 사업자번호 {tgt_bn} / {tgt_addr} / {tgt_phone}</p>
<table><thead><tr><th>품목</th><th>수량</th><th>단위</th><th>단가</th><th>금액</th></tr></thead>
<tbody>{rows}</tbody></table>
<p><b>합계</b> {total:,.0f}원</p>
<p><b>납기</b> {deadline or '-'} / <b>유효기간</b> {valid_until or '-'}</p>
<p><b>비고</b> {notes}</p>
</body></html>"""


@app.post("/ai/generate-quote")
def ai_generate_quote(body: GenerateQuoteRequest):
    try:
        req = fetch_one("SELECT * FROM companies WHERE id = %s", (body.requester_company_id,))
        tgt = fetch_one("SELECT * FROM companies WHERE id = %s", (body.target_company_id,))
        if not req or not tgt:
            raise HTTPException(status_code=400, detail="업체 정보를 찾을 수 없습니다.")

        items_dicts = [x.model_dump() for x in body.items]
        total = sum(float(x.get("amount") or 0) for x in items_dicts)
        if total <= 0:
            total = sum(
                float(x.get("unit_price") or 0) * int(x.get("quantity") or 0) for x in items_dicts
            )

        dl = body.deadline
        vu = body.valid_until
        quote_html = _render_quote_html(
            str(req.get("name") or ""),
            str(req.get("address") or ""),
            str(req.get("business_number") or ""),
            str(req.get("contact_phone") or ""),
            str(tgt.get("name") or ""),
            str(tgt.get("address") or ""),
            str(tgt.get("business_number") or ""),
            str(tgt.get("contact_phone") or ""),
            items_dicts,
            total,
            dl,
            vu,
            body.notes,
        )
        plain = re.sub(r"<[^>]+>", " ", quote_html)
        quote_text = re.sub(r"\s+", " ", plain).strip()

        items_json = json.dumps(items_dicts, ensure_ascii=False)
        qid = execute(
            """
            INSERT INTO quotes (requester_company_id, target_company_id, items_json,
              quote_html, quote_text, total_amount, deadline, valid_until, notes, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'draft')
            """,
            (
                body.requester_company_id,
                body.target_company_id,
                items_json,
                quote_html,
                quote_text,
                total,
                dl,
                vu,
                body.notes or None,
            ),
        )
        return {"quote_id": qid, "quote_html": quote_html, "quote_text": quote_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("generate-quote")
        raise HTTPException(status_code=500, detail=f"견적서 생성 실패: {e}") from e


class GenerateContractAiRequest(BaseModel):
    quote_id: int
    payment_terms: str = "계약금 30%, 잔금 납품 후 30일"
    warranty_months: int = 12
    special_terms: str = ""


@app.post("/ai/generate-contract")
def ai_generate_contract_draft(body: GenerateContractAiRequest):
    try:
        q = fetch_one("SELECT * FROM quotes WHERE id = %s", (body.quote_id,))
        if not q:
            raise HTTPException(status_code=404, detail="견적을 찾을 수 없습니다.")
        req_c = fetch_one(
            "SELECT * FROM companies WHERE id = %s", (q["requester_company_id"],)
        )
        tgt_c = fetch_one("SELECT * FROM companies WHERE id = %s", (q["target_company_id"],))
        if not req_c or not tgt_c:
            raise HTTPException(status_code=400, detail="견적 당사자 업체 정보 오류")

        items = q.get("items_json")
        if isinstance(items, str):
            items = json.loads(items)
        items_txt = json.dumps(items, ensure_ascii=False)

        warranty = int(body.warranty_months or 12)
        pay = body.payment_terms or ""
        special = body.special_terms or ""

        contract_html = f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap" rel="stylesheet"/>
<style>
body {{ font-family: 'Nanum Gothic', sans-serif; padding: 24px; line-height: 1.6; }}
h1 {{ font-size: 20px; }}
</style></head><body>
<h1>공 급 계 약 서 (초안)</h1>
<p><b>갑(매수인)</b> {req_c.get('name')} (사업자번호 {req_c.get('business_number')}) 주소 {req_c.get('address')}</p>
<p><b>을(매도인)</b> {tgt_c.get('name')} (사업자번호 {tgt_c.get('business_number')}) 주소 {tgt_c.get('address')}</p>
<h2>제1조 (계약 목적)</h2>
<p>을은 갑에게 다음 품목을 제조·공급하고, 갑은 이에 대한 대금을 지급한다.</p>
<h2>제2조 (공급 품목)</h2>
<pre style="white-space:pre-wrap;font-family:inherit">{items_txt}</pre>
<h2>제3조 (납품 조건)</h2>
<p>납품 장소 및 일정은 별도 협의에 따르며, 견적서 및 확정 주문서를 우선한다.</p>
<h2>제4조 (대금 지급)</h2>
<p>{pay}</p>
<h2>제5조 (지체상금)</h2>
<p>당사자 일방이 본 계약상 의무를 이행하지 아니하여 상대방에게 손해를 입힌 경우, 지체일수에 대하여 미이행 금액의 연 0.1%에 해당하는 지체상금을 지급한다.</p>
<h2>제6조 (품질보증)</h2>
<p>을은 납품일로부터 {warranty}개월간 품질보증을 부담한다.</p>
<h2>제7조 (비밀유지)</h2>
<p>당사자는 본 계약 및 이행 과정에서 알게 된 상대방의 영업 비밀을 제3자에게 누설하지 아니한다.</p>
<h2>제8조 (분쟁해결)</h2>
<p>본 계약과 관련한 분쟁은 대한상사중재원의 중재 규칙에 따른 중재로 최종 해결한다.</p>
<h2>제9조 (특약)</h2>
<p>{special}</p>
</body></html>"""

        plain = re.sub(r"<[^>]+>", " ", contract_html)
        contract_text = re.sub(r"\s+", " ", plain).strip()

        did = execute(
            """
            INSERT INTO contract_drafts (quote_id, contract_html, contract_text,
              payment_terms, warranty_months, special_terms, status)
            VALUES (%s,%s,%s,%s,%s,%s,'draft')
            """,
            (
                body.quote_id,
                contract_html,
                contract_text,
                pay,
                warranty,
                special,
            ),
        )
        return {"draft_id": did, "contract_html": contract_html, "contract_text": contract_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("generate-contract")
        raise HTTPException(status_code=500, detail=f"계약서 초안 생성 실패: {e}") from e


class ExportPdfRequest(BaseModel):
    html_content: str
    filename: str
    type: Literal["quote", "contract"]
    quote_id: Optional[int] = None
    draft_id: Optional[int] = None


@app.post("/ai/export-pdf")
def ai_export_pdf(body: ExportPdfRequest):
    try:
        from weasyprint import HTML

        safe_name = re.sub(r"[^\w가-힣\-_.]", "_", body.filename)[:200]
        out_dir = _pdf_dir()
        path = out_dir / f"{safe_name}.pdf"

        html_wrapped = (
            "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/>"
            "<link href=\"https://fonts.googleapis.com/css2?family=Nanum+Gothic&display=swap\" rel=\"stylesheet\"/>"
            "<style>body{font-family:'Nanum Gothic',sans-serif;}</style></head><body>"
            + body.html_content
            + "</body></html>"
        )
        HTML(string=html_wrapped, base_url=str(out_dir)).write_pdf(str(path))

        if body.type == "quote" and body.quote_id is not None:
            execute(
                "UPDATE quotes SET pdf_path = %s WHERE id = %s",
                (str(path), body.quote_id),
            )
        elif body.type == "contract" and body.draft_id is not None:
            execute(
                "UPDATE contract_drafts SET pdf_path = %s WHERE id = %s",
                (str(path), body.draft_id),
            )

        data = path.read_bytes()
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
        )
    except Exception as e:
        logger.exception("export-pdf")
        raise HTTPException(status_code=500, detail=f"PDF 생성 실패: {e}") from e
