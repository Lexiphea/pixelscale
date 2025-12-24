import time

from fastapi import APIRouter

from ..schemas import StressResponse

router = APIRouter(prefix="/api", tags=["Stress Test"])


@router.get("/stress/{seconds}", response_model=StressResponse)
async def stress_test(seconds: int) -> StressResponse:
    seconds = min(seconds, 60)

    end_time = time.time() + seconds
    while time.time() < end_time:
        _ = sum(i * i for i in range(10000))

    return StressResponse(
        message=f"CPU stress test completed for {seconds} seconds",
        duration_seconds=seconds,
    )
