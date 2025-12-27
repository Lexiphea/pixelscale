"""Custom StaticFiles class with cache headers for immutable image assets."""

from starlette.responses import Response
from starlette.staticfiles import StaticFiles


class CachingStaticFiles(StaticFiles):
    """StaticFiles subclass that adds Cache-Control headers for immutable assets.
    
    Since processed images are immutable (reprocessing creates new keys),
    we can safely cache them for a long duration.
    """
    
    def __init__(self, *args, max_age: int = 31536000, **kwargs):
        """Initialize with configurable cache max-age.
        
        Args:
            max_age: Cache duration in seconds. Default is 1 year (31536000s).
        """
        super().__init__(*args, **kwargs)
        self.max_age = max_age
    
    async def get_response(self, path: str, scope) -> Response:
        """Get response with cache headers added."""
        response = await super().get_response(path, scope)
        
        # Add cache headers for successful responses
        if response.status_code == 200:
            response.headers["Cache-Control"] = f"public, max-age={self.max_age}, immutable"
        
        return response
