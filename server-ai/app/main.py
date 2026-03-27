from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from openai import OpenAI
import os

app = FastAPI(title="Factory-Link AI Service")
vectorizer = TfidfVectorizer()


class PartAnalysisRequest(BaseModel):
    parts: list[str]


class ContractRequest(BaseModel):
    buyer_name: str
    seller_name: str
    part_name: str
    quantity: int
    unit_price: float


@app.get("/health")
def health():
    return {"status": "ok", "service": "server-ai"}


@app.post("/analyze/parts")
def analyze_parts(payload: PartAnalysisRequest):
    # 간단한 TF-IDF 유사도 예시로 부품 텍스트를 분석한다.
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
    # OpenAI API 키가 없는 환경에서도 데모 응답을 반환한다.
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
