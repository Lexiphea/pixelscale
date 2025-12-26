from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .database import Base, engine
from .logging_config import get_logger, setup_logging
from .middleware.logging_middleware import LoggingMiddleware
from .routers import auth, health, images, share, stress
from .routers.auth import limiter

# Initialize logging before anything else
setup_logging()
logger = get_logger(__name__)

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PixelScale API",
    description="Image hosting and processing platform",
    version="1.0.0",
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add logging middleware (must be after CORS)
app.add_middleware(LoggingMiddleware)

logger.info("PixelScale API starting up")

if settings.use_local_storage:
    uploads_path = Path(settings.local_storage_path)
    uploads_path.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")
    logger.info(f"Using local storage: {uploads_path}")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(images.router)
app.include_router(share.router)
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
