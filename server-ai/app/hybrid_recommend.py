"""하이브리드 추천 점수 계산."""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.gemini_client import embed_texts_batch
from app.ontology_loader import OntologyCache


def _normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _tokenize(s: str) -> Set[str]:
    s = _normalize_text(s)
    if not s:
        return set()
    parts = re.split(r"[\s,，·/|]+", s)
    return {p for p in parts if len(p) >= 1}


def keyword_fit_score(
    query_text: str,
    part_name: str,
    part_category: str,
    ontology: OntologyCache,
) -> float:
    """온톨로지·부분 문자열 기반 0~1."""
    q = _normalize_text(query_text).lower()
    name = _normalize_text(part_name).lower()
    cat = _normalize_text(part_category).lower()
    blob = f"{name} {cat}"
    if not q or not blob:
        return 0.0
    if q in blob or blob in q:
        return 1.0
    qt = _tokenize(q)
    bt = _tokenize(blob)
    expanded = ontology.expand_tokens(qt)
    inter = (expanded & bt) | (qt & bt)
    if inter:
        return min(1.0, 0.5 + 0.1 * len(inter))
    # 온톨로지 직접 매칭
    best = 0.0
    for t in qt:
        for rt, _rel, w in ontology.related_for(t):
            rl = rt.lower()
            if rl and (rl in blob or any(x in rl for x in bt if len(x) > 1)):
                best = max(best, float(w))
    return best


def category_fit_score(
    query_categories: Set[str],
    part_category: str,
    ontology: OntologyCache,
) -> float:
    if not part_category:
        return 0.0
    pc = part_category.strip()
    if not query_categories:
        return 0.5  # 쿼리 카테고리 없으면 중간값
    best = 0.0
    expanded_queries: Set[str] = set()
    for qc in query_categories:
        expanded_queries.add(qc)
        expanded_queries |= ontology.expand_tokens({qc})
    for qc in expanded_queries:
        if qc == pc:
            best = max(best, 1.0)
            continue
        if qc in pc or pc in qc:
            best = max(best, 0.9)
            continue
        for rt, rel, w in ontology.related_for(qc):
            if rt == pc or rt in pc or pc in rt:
                bonus = 0.85 if rel in ("child", "parent") else float(w)
                best = max(best, bonus)
    return min(1.0, best)


def region_bonus(request_region: Optional[str], part_region: Optional[str]) -> float:
    if not request_region or not part_region:
        return 0.0
    a = request_region.strip()
    b = part_region.strip()
    if not a or not b:
        return 0.0
    if a in b or b in a:
        return 1.0
    return 0.0


def build_company_parts(
    rows: List[Dict[str, Any]],
) -> Dict[int, List[Dict[str, Any]]]:
    by_c: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for r in rows:
        cid = int(r["company_id"])
        by_c[cid].append(r)
    return by_c


def hybrid_recommend(
    embedding_model: str,
    ontology: OntologyCache,
    query_items: List[str],
    query_company_id: int,
    region: Optional[str],
    top_k: int,
    parts_rows: List[Dict[str, Any]],
    companies: Dict[int, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    parts_rows: id, company_id, name, category, description, region
    companies: company_id -> { id, name, region, address }
    """
    # 자기 자신 제외
    parts_rows = [r for r in parts_rows if int(r["company_id"]) != query_company_id]
    by_company = build_company_parts(parts_rows)

    query_text = " ".join(_normalize_text(x) for x in query_items if x)
    if not query_text:
        query_text = "제조 부품"

    query_categories: Set[str] = set()
    for qi in query_items:
        for t in _tokenize(qi):
            if len(t) >= 2:
                query_categories.add(t)

    # 업체당 대표 텍스트 (품목별 임베딩 후 max 풀링)
    company_ids = sorted(by_company.keys())
    if not company_ids:
        return []

    part_texts: List[str] = []
    part_meta: List[Tuple[int, str, str, str]] = []  # company_id, name, category, region

    for r in parts_rows:
        cid = int(r["company_id"])
        name = _normalize_text(str(r.get("name") or ""))
        desc = _normalize_text(str(r.get("description") or ""))
        blob = f"{name} {desc}".strip()
        part_texts.append(blob or name)
        part_meta.append(
            (cid, name, str(r.get("category") or ""), str(r.get("region") or ""))
        )

    q_emb = embed_texts_batch(
        [query_text], embedding_model or None, task_type="retrieval_query"
    )
    if part_texts:
        p_emb = embed_texts_batch(
            part_texts, embedding_model or None, task_type="retrieval_document"
        )
        sims = cosine_similarity(q_emb, p_emb)[0]
    else:
        sims = np.array([])

    # part index -> company max embedding
    best_emb_by_company: Dict[int, float] = {}
    for i, (cid, _, _, _) in enumerate(part_meta):
        s = float(sims[i]) if len(sims) > i else 0.0
        best_emb_by_company[cid] = max(best_emb_by_company.get(cid, 0.0), s)

    results: List[Dict[str, Any]] = []
    for cid in company_ids:
        parts = by_company[cid]
        emb = float(best_emb_by_company.get(cid, 0.0))

        kw_scores = []
        cat_scores = []
        matched_names: List[str] = []
        reg_hit = 0.0
        for p in parts:
            name = str(p.get("name") or "")
            cat = str(p.get("category") or "")
            pr = str(p.get("region") or "")
            ks = keyword_fit_score(query_text, name, cat, ontology)
            cs = category_fit_score(query_categories, cat, ontology)
            kw_scores.append(ks)
            cat_scores.append(cs)
            if ks > 0.4 or cs > 0.5:
                matched_names.append(name)
            reg_hit = max(reg_hit, region_bonus(region, pr))

        kw = max(kw_scores) if kw_scores else 0.0
        cat = max(cat_scores) if cat_scores else 0.0

        # 가중합
        final = emb * 0.4 + kw * 0.25 + cat * 0.25 + reg_hit * 0.1
        final = max(0.0, min(1.0, float(final)))

        cinfo = companies.get(cid, {})
        cname = str(cinfo.get("name") or "")
        creg = str(cinfo.get("region") or "")
        addr = str(cinfo.get("address") or "")

        reason_parts = []
        if matched_names:
            reason_parts.append(f"연관 생산품 {len(matched_names)}건 반영")
        if kw > 0.5:
            reason_parts.append("키워드·온톨로지 정합")
        if cat > 0.5:
            reason_parts.append("카테고리 정합")
        if reg_hit > 0:
            reason_parts.append("지역 조건 일치")
        if not reason_parts:
            reason_parts.append("임베딩 유사도 기반")

        results.append(
            {
                "company_id": cid,
                "company_name": cname,
                "score": round(final, 4),
                "reason": " · ".join(reason_parts),
                "matched_parts": matched_names[:8],
                "region": creg or "",
                "address": addr or "",
            }
        )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[: max(1, top_k)]
