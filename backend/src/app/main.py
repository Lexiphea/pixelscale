import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import Base, engine
from .routers import health, images, stress

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PixelScale API",
    description="Image hosting and processing platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.use_local_storage:
    uploads_path = Path(settings.local_storage_path)
    uploads_path.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

app.include_router(health.router)
app.include_router(images.router)
app.include_router(stress.router)


@app.get("/")
async def root():
    routes = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            for method in route.methods:
                if method != "HEAD":
                    routes.append({
                        "method": method,
                        "path": route.path,
                        "name": route.name,
                    })

    return {
        "name": "PixelScale API",
        "version": "1.0.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "endpoints": sorted(routes, key=lambda x: (x["path"], x["method"])),
    }

