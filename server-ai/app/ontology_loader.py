"""part_ontology 테이블 로드 및 메모리 캐시."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple

from app.database import fetch_all


@dataclass(frozen=True)
class OntologyEdge:
    term: str
    related_term: str
    relation_type: str
    weight: float


class OntologyCache:
    """term → 연관 (related_term, relation_type, weight) 목록."""

    def __init__(self) -> None:
        self._edges: List[OntologyEdge] = []
        self._term_to_related: Dict[str, List[Tuple[str, str, float]]] = {}

    def load_from_db(self) -> None:
        rows = fetch_all(
            """
            SELECT term, related_term, relation_type, COALESCE(weight, 0.85) AS weight
            FROM part_ontology
            """
        )
        self._edges = []
        self._term_to_related = {}
        for r in rows:
            t = (r.get("term") or "").strip()
            rt = (r.get("related_term") or "").strip()
            rel = (r.get("relation_type") or "related").strip()
            w = float(r.get("weight") or 0.85)
            if not t or not rt:
                continue
            self._edges.append(OntologyEdge(t, rt, rel, w))
            self._term_to_related.setdefault(t, []).append((rt, rel, w))
            # 역방향 조회용 (related_term에서 term으로도 매칭)
            self._term_to_related.setdefault(rt, []).append((t, rel, w))

    def edges(self) -> List[OntologyEdge]:
        return self._edges

    def related_for(self, term: str) -> List[Tuple[str, str, float]]:
        return self._term_to_related.get(term.strip(), [])

    def expand_tokens(self, tokens: Set[str]) -> Set[str]:
        """동의어·상하위 확장된 토큰 집합."""
        out: Set[str] = set(tokens)
        for t in list(tokens):
            for rt, _, _ in self.related_for(t):
                out.add(rt)
        return out


# 앱 전역 캐시 (lifespan에서 초기화)
ontology_cache = OntologyCache()
