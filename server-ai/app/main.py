import os
from typing import Any, Literal, Optional

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from sklearn.preprocessing import MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

app = FastAPI(title="Factory-Link AI Service")
vectorizer = TfidfVectorizer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "content": (
                f"This contract is made between {payload.buyer_name} and {payload.seller_name} "
                f"for {payload.quantity} units of {payload.part_name} at {payload.unit_price} per unit."
            ),
            "source": "fallback-template",
        }

    client = OpenAI(api_key=api_key)
    prompt = (
        "Generate a concise B2B manufacturing supply contract with legal tone. "
        f"Buyer: {payload.buyer_name}, Seller: {payload.seller_name}, "
        f"Part: {payload.part_name}, Quantity: {payload.quantity}, Unit Price: {payload.unit_price}."
    )

    completion = client.responses.create(
        model="gpt-4o-mini",
        input=prompt,
    )

    return {"content": completion.output_text, "source": "openai"}


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

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "success": True,
            "data": {"contract_text": fallback},
            "message": "계약서 생성 완료",
        }

    try:
        client = OpenAI(api_key=api_key)
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=2000,
        )
        text = completion.choices[0].message.content or fallback
        return {"success": True, "data": {"contract_text": text}, "message": "계약서 생성 완료"}
    except Exception:
        return {
            "success": True,
            "data": {"contract_text": fallback},
            "message": "계약서 생성 완료",
        }
