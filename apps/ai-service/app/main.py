import base64
import json
import os
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://growlab-ollama:11434")
DEFAULT_MODEL = os.getenv("GROWLAB_AI_DEFAULT_MODEL", "qwen2.5vl:7b")
FALLBACK_MODEL = os.getenv("GROWLAB_AI_FALLBACK_MODEL", "qwen2.5vl:3b")
IMAGE_STORAGE_PATH = Path(os.getenv("GROWLAB_IMAGE_STORAGE_PATH", "/data/images")).resolve()
PROMPT_VERSION = "plant-image-v1"


class PlantContext(BaseModel):
    species: str | None = None
    zone: str | None = None
    notes: str | None = None


class AnalyzePlantImageRequest(BaseModel):
    image_path: str = Field(alias="imagePath")
    plant_context: PlantContext = Field(default_factory=PlantContext, alias="plantContext")
    model: str | None = None


class PossibleIssue(BaseModel):
    issue: str
    confidence: float = Field(ge=0, le=1)


class AnalyzePlantImageResponse(BaseModel):
    health_status: Literal["healthy", "warning", "critical", "unknown"] = Field(alias="healthStatus")
    confidence: float = Field(ge=0, le=1)
    observations: list[str]
    possible_issues: list[PossibleIssue] = Field(default_factory=list, alias="possibleIssues")
    suggestions: list[str]
    requires_human_review: bool = Field(alias="requiresHumanReview")
    model_name: str = Field(alias="modelName")
    prompt_version: str = Field(default=PROMPT_VERSION, alias="promptVersion")


app = FastAPI(title="GrowLab AI Service", version="0.1.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"service": "growlab-ai", "status": "healthy", "model": DEFAULT_MODEL}


@app.get("/models")
async def models() -> dict[str, str]:
    return {"default": DEFAULT_MODEL, "fallback": FALLBACK_MODEL}


@app.post("/analyze-plant-image", response_model=AnalyzePlantImageResponse)
async def analyze_plant_image(request: AnalyzePlantImageRequest) -> AnalyzePlantImageResponse:
    image_path = resolve_image_path(request.image_path)
    if not image_path.exists() or not image_path.is_file():
        raise HTTPException(status_code=404, detail="Image file not found")

    image_bytes = image_path.read_bytes()
    if len(image_bytes) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large for MVP analysis")

    model = request.model or DEFAULT_MODEL
    prompt = build_prompt(request.plant_context)
    raw = await call_ollama(model, prompt, image_bytes)
    return parse_ai_response(raw, model)


def resolve_image_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if not path.is_absolute():
        path = IMAGE_STORAGE_PATH / path
    resolved = path.resolve()
    if IMAGE_STORAGE_PATH not in resolved.parents and resolved != IMAGE_STORAGE_PATH:
        raise HTTPException(status_code=400, detail="Image path must be inside the configured image storage path")
    return resolved


def build_prompt(context: PlantContext) -> str:
    context_json = context.model_dump_json(exclude_none=True)
    return (
        "You are an advisory plant health assistant for a local-only home lab. "
        "Analyze the plant image visually. Do not suggest or execute device commands. "
        "Return only compact JSON with keys: healthStatus, confidence, observations, "
        "possibleIssues, suggestions, requiresHumanReview. "
        f"Plant context: {context_json}"
    )


async def call_ollama(model: str, prompt: str, image_bytes: bytes) -> str:
    payload = {
        "model": model,
        "prompt": prompt,
        "images": [base64.b64encode(image_bytes).decode("ascii")],
        "stream": False,
        "format": "json"
    }
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate", json=payload)
        response.raise_for_status()
        data = response.json()
    return str(data.get("response", "{}"))


def parse_ai_response(raw: str, model: str) -> AnalyzePlantImageResponse:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Ollama returned non-JSON output") from exc

    data.setdefault("healthStatus", "unknown")
    data.setdefault("confidence", 0)
    data.setdefault("observations", ["Image could not be assessed confidently."])
    data.setdefault("possibleIssues", [])
    data.setdefault("suggestions", ["Review manually."])
    data.setdefault("requiresHumanReview", True)
    data["modelName"] = model
    data["promptVersion"] = PROMPT_VERSION

    try:
        return AnalyzePlantImageResponse.model_validate(data)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Ollama JSON did not match the expected schema") from exc
