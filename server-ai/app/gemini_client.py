"""Google Gemini API (임베딩·텍스트 생성). 환경: GEMINI_API_KEY 또는 GOOGLE_API_KEY."""

from __future__ import annotations

import json
import logging
import os
import re
import time
import urllib.error
import urllib.request
from typing import Any, List, Optional

import numpy as np

logger = logging.getLogger("factorylink.ai.gemini")


def _api_key() -> str:
    return (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()


def configure() -> None:
    key = _api_key()
    if not key:
        raise RuntimeError("GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다.")


def text_model_name() -> str:
    return (os.getenv("GEMINI_TEXT_MODEL") or "gemini-2.0-flash").strip()


def embedding_model_name() -> str:
    # Gemini API: embedContent는 models/gemini-embedding-001 권장 (text-embedding-004 등은 v1beta에서 미지원·404일 수 있음)
    raw = (os.getenv("GEMINI_EMBEDDING_MODEL") or "gemini-embedding-001").strip()
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


def _parse_retry_seconds(detail: str) -> Optional[float]:
    try:
        err = json.loads(detail)
        if isinstance(err, dict):
            for d in (err.get("error") or {}).get("details") or []:
                if d.get("@type") == "type.googleapis.com/google.rpc.RetryInfo":
                    delay = d.get("retryDelay", "")
                    if isinstance(delay, str) and delay.endswith("s"):
                        return float(delay[:-1])
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    return None


def _post_json(
    url: str,
    body: dict[str, Any],
    *,
    max_retries: int = 3,
) -> dict[str, Any]:
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    last_detail = ""
    for attempt in range(max_retries):
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="ignore")
            last_detail = detail
            if e.code == 429 and attempt < max_retries - 1:
                wait = _parse_retry_seconds(detail)
                if wait is None:
                    wait = min(2.0 ** attempt, 60.0)
                logger.warning(
                    "Gemini HTTP 429, %.1f초 후 재시도 (%d/%d)", wait, attempt + 1, max_retries
                )
                time.sleep(wait)
                continue
            raise RuntimeError(f"Gemini API 오류: HTTP {e.code} {detail}") from e
    raise RuntimeError(f"Gemini API 오류: 재시도 실패 {last_detail}")


def _embed_endpoint(model: str) -> str:
    return f"https://generativelanguage.googleapis.com/v1beta/{model}:embedContent?key={_api_key()}"


def _batch_embed_endpoint(model: str) -> str:
    return f"https://generativelanguage.googleapis.com/v1beta/{model}:batchEmbedContents?key={_api_key()}"


# Gemini BatchEmbedContents: "at most 100 requests can be in one batch"
GEMINI_BATCH_EMBED_MAX = 100


def _generate_endpoint(model: str) -> str:
    return f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_api_key()}"


def _task_type_enum(task_type: str) -> str:
    """Gemini TaskType: RETRIEVAL_QUERY, RETRIEVAL_DOCUMENT, SEMANTIC_SIMILARITY 등 (스네이크 → 대문자+언더스코어)."""
    t = (task_type or "retrieval_document").strip().lower()
    return t.upper()


def _embedding_model_chain(primary: str) -> List[str]:
    """404 시 순서대로 시도 (구형 text-embedding-* → gemini-embedding-001 → embedding-001)."""
    env_extra = (os.getenv("GEMINI_EMBEDDING_MODEL_FALLBACKS") or "").strip()
    extra: List[str] = []
    if env_extra:
        for part in env_extra.split(","):
            p = part.strip()
            if p:
                extra.append(_normalize_embed_model(p))
    seen: set[str] = set()
    out: List[str] = []
    for cand in [primary, *extra, "models/gemini-embedding-001", "models/embedding-001"]:
        if cand not in seen:
            seen.add(cand)
            out.append(cand)
    return out


def _embed_one(
    model: str,
    text: str,
    *,
    task_enum: str,
    with_task: bool,
) -> np.ndarray:
    endpoint = _embed_endpoint(model)
    base = {"content": {"parts": [{"text": text or " "}]}}
    if with_task:
        body = {**base, "taskType": task_enum}
        try:
            r = _post_json(endpoint, body)
        except RuntimeError:
            r = _post_json(endpoint, base)
    else:
        r = _post_json(endpoint, base)
    emb = (r.get("embedding") or {}).get("values")
    if not emb:
        raise RuntimeError("Gemini 임베딩 응답에 embedding.values 가 없습니다.")
    return np.array(emb, dtype=np.float64)


def _embed_batch_api_single(
    model: str,
    texts: List[str],
    *,
    task_enum: str,
    with_task: bool,
) -> np.ndarray:
    """한 번의 batchEmbedContents 호출 (texts 길이 ≤ GEMINI_BATCH_EMBED_MAX)."""
    endpoint = _batch_embed_endpoint(model)
    requests_body: List[dict[str, Any]] = []
    for t in texts:
        req: dict[str, Any] = {
            "model": model,
            "content": {"parts": [{"text": t or " "}]},
        }
        if with_task:
            req["taskType"] = task_enum
        requests_body.append(req)
    try:
        r = _post_json(endpoint, {"requests": requests_body})
    except RuntimeError:
        if with_task:
            requests_body = [
                {"model": model, "content": {"parts": [{"text": t or " "}]}}
                for t in texts
            ]
            r = _post_json(endpoint, {"requests": requests_body})
        else:
            raise
    embeddings = r.get("embeddings") or []
    if len(embeddings) != len(texts):
        raise RuntimeError(
            f"batchEmbedContents 길이 불일치: 요청 {len(texts)}개, 응답 {len(embeddings)}개"
        )
    rows: List[np.ndarray] = []
    for emb_obj in embeddings:
        vals = (emb_obj or {}).get("values")
        if not vals:
            raise RuntimeError("Gemini 임베딩 응답에 values 가 없습니다.")
        rows.append(np.array(vals, dtype=np.float64))
    return np.vstack(rows)


def _embed_batch_api(
    model: str,
    texts: List[str],
    *,
    task_enum: str,
    with_task: bool,
) -> np.ndarray:
    if not texts:
        return np.zeros((0, 1))
    chunks: List[np.ndarray] = []
    delay_sec = float((os.getenv("GEMINI_EMBED_CHUNK_DELAY_SEC") or "0.12").strip())
    for i in range(0, len(texts), GEMINI_BATCH_EMBED_MAX):
        if i > 0 and delay_sec > 0:
            time.sleep(delay_sec)
        sub = texts[i : i + GEMINI_BATCH_EMBED_MAX]
        chunks.append(
            _embed_batch_api_single(
                model, sub, task_enum=task_enum, with_task=with_task
            )
        )
    return np.vstack(chunks)


def embed_texts_batch(
    texts: List[str],
    model: Optional[str] = None,
    *,
    task_type: str = "retrieval_document",
) -> np.ndarray:
    """문장 리스트 → 임베딩 행렬 (순서 유지). task_type: retrieval_query | retrieval_document | semantic_similarity 등."""
    if not texts:
        return np.zeros((0, 1))
    primary = _normalize_embed_model(model)
    task_enum = _task_type_enum(task_type)
    last_err: Optional[Exception] = None
    for m in _embedding_model_chain(primary):
        for with_task in (True, False):
            try:
                if len(texts) == 1:
                    v = _embed_one(m, texts[0], task_enum=task_enum, with_task=with_task)
                    return v.reshape(1, -1)
                return _embed_batch_api(
                    m, texts, task_enum=task_enum, with_task=with_task
                )
            except RuntimeError as e:
                err_s = str(e)
                last_err = e
                if "404" in err_s or "NOT_FOUND" in err_s:
                    logger.info("임베딩 모델 미지원/404, 다음 모델 시도: %s", m)
                    break
                if with_task:
                    logger.debug("embed 실패(taskType=%s), 재시도: %s", with_task, e)
                    continue
                break
            except Exception as e:
                last_err = e
                break
    raise RuntimeError(
        f"Gemini 임베딩을 가져오지 못했습니다. 마지막 오류: {last_err}"
    ) from last_err


def generate_text(
    prompt: str,
    *,
    system_instruction: Optional[str] = None,
    temperature: float = 0.4,
    max_output_tokens: int = 4096,
) -> str:
    model = text_model_name()
    body: dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
        },
    }
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    resp = _post_json(_generate_endpoint(model), body)
    return _extract_text(resp)


def generate_json_from_prompt(prompt: str, *, temperature: float = 0.2) -> dict[str, Any]:
    """JSON 객체만 반환하도록 요청 (실패 시 텍스트에서 JSON 추출 시도)."""
    model = text_model_name()
    try:
        resp = _post_json(
            _generate_endpoint(model),
            {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": 8192,
                    "responseMimeType": "application/json",
                },
            },
        )
        raw = _extract_text(resp)
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.debug("JSON mime 응답 실패, 일반 생성으로 재시도: %s", e)

    resp2 = _post_json(
        _generate_endpoint(model),
        {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                            + "\n\n위 요구에 맞춰 유효한 JSON 객체 하나만 출력하세요. 다른 설명은 쓰지 마세요."
                        }
                    ]
                }
            ],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": 8192},
        },
    )
    raw2 = _extract_text(resp2)
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


def _extract_text(resp: dict[str, Any]) -> str:
    """Gemini generateContent 응답에서 텍스트 추출."""
    candidates = resp.get("candidates") or []
    for cand in candidates:
        content = cand.get("content") or {}
        parts = content.get("parts") or []
        chunks: list[str] = []
        for p in parts:
            text = p.get("text")
            if text:
                chunks.append(text)
        if chunks:
            return "".join(chunks).strip()
    return ""
