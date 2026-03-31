"""Google Gemini API (임베딩·텍스트 생성). 환경: GEMINI_API_KEY 또는 GOOGLE_API_KEY."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, List, Optional

import google.generativeai as genai
import numpy as np

logger = logging.getLogger("factorylink.ai.gemini")


def _api_key() -> str:
    return (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()


def configure() -> None:
    key = _api_key()
    if not key:
        raise RuntimeError("GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다.")
    genai.configure(api_key=key)


def text_model_name() -> str:
    return (os.getenv("GEMINI_TEXT_MODEL") or "gemini-2.0-flash").strip()


def embedding_model_name() -> str:
    raw = (os.getenv("GEMINI_EMBEDDING_MODEL") or "text-embedding-004").strip()
    if raw.startswith("models/"):
        return raw
    return f"models/{raw}"


def _normalize_embed_model(model: Optional[str]) -> str:
    m = (model or "").strip()
    if not m:
        return embedding_model_name()
    if m.startswith("models/"):
        return m
    return f"models/{m}"


def embed_texts_batch(
    texts: List[str],
    model: Optional[str] = None,
    *,
    task_type: str = "retrieval_document",
) -> np.ndarray:
    """문장 리스트 → 임베딩 행렬 (순서 유지). task_type: retrieval_query | retrieval_document 등."""
    if not texts:
        return np.zeros((0, 1))
    m = _normalize_embed_model(model)
    vecs: List[np.ndarray] = []
    for t in texts:
        try:
            r = genai.embed_content(
                model=m,
                content=t or " ",
                task_type=task_type,
            )
        except Exception as e:
            logger.debug("embed task_type=%s 실패, task_type 없이 재시도: %s", task_type, e)
            r = genai.embed_content(model=m, content=t or " ")
        emb = r.get("embedding") if isinstance(r, dict) else getattr(r, "embedding", None)
        if emb is None:
            raise RuntimeError("Gemini 임베딩 응답에 embedding 이 없습니다.")
        vecs.append(np.array(emb, dtype=np.float64))
    return np.vstack(vecs)


def generate_text(
    prompt: str,
    *,
    system_instruction: Optional[str] = None,
    temperature: float = 0.4,
    max_output_tokens: int = 4096,
) -> str:
    model = genai.GenerativeModel(
        text_model_name(),
        system_instruction=system_instruction,
    )
    cfg = genai.GenerationConfig(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )
    resp = model.generate_content(prompt, generation_config=cfg)
    try:
        return (resp.text or "").strip()
    except (ValueError, AttributeError):
        return ""


def generate_json_from_prompt(prompt: str, *, temperature: float = 0.2) -> dict[str, Any]:
    """JSON 객체만 반환하도록 요청 (실패 시 텍스트에서 JSON 추출 시도)."""
    model = genai.GenerativeModel(text_model_name())
    try:
        cfg = genai.GenerationConfig(
            temperature=temperature,
            response_mime_type="application/json",
            max_output_tokens=8192,
        )
        resp = model.generate_content(prompt, generation_config=cfg)
        try:
            raw = (resp.text or "").strip()
        except ValueError:
            raw = ""
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.debug("JSON mime 응답 실패, 일반 생성으로 재시도: %s", e)

    cfg2 = genai.GenerationConfig(temperature=temperature, max_output_tokens=8192)
    resp2 = model.generate_content(
        prompt + "\n\n위 요구에 맞춰 유효한 JSON 객체 하나만 출력하세요. 다른 설명은 쓰지 마세요.",
        generation_config=cfg2,
    )
    try:
        raw2 = (resp2.text or "").strip()
    except ValueError:
        raw2 = ""
    raw2 = _strip_json_fence(raw2)
    try:
        return json.loads(raw2)
    except json.JSONDecodeError as e:
        logger.warning("JSON 파싱 실패 (일부): %s", raw2[:500])
        raise RuntimeError("모델 응답을 JSON으로 파싱하지 못했습니다.") from e


def _strip_json_fence(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z0-9]*\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()
