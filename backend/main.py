from __future__ import annotations

from fastapi import FastAPI

from api.map_data import router as map_data_router
from data.run_pipeline import run_pipeline


app = FastAPI(title="Foresight Data Pipeline API")


@app.get("/")
def root():
    return {
        "message": "Foresight backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.post("/run-pipeline")
def run_pipeline_endpoint():
    results = run_pipeline()
    return {
        "status": "success",
        "count": len(results),
        "sample": results[0] if results else None,
    }


app.include_router(map_data_router)