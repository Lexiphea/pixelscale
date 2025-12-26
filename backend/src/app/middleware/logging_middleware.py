"""
Request/Response logging middleware with correlation ID support.

Logs:
- Request method, path, query params
- Response status code and latency
- Client IP address
- User ID (encrypted) if authenticated
- Redacts sensitive headers
"""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from ..logging_config import correlation_id_var, get_logger

logger = get_logger(__name__)

# Headers to redact from logs
SENSITIVE_HEADERS = {
    "authorization",
    "cookie",
    "x-api-key",
    "x-auth-token",
}


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs all requests and responses with correlation IDs."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique correlation ID for this request
        correlation_id = uuid.uuid4().hex[:12]
        correlation_id_var.set(correlation_id)

        # Store correlation ID in request state for access in route handlers
        request.state.correlation_id = correlation_id

        # Extract request info
        method = request.method
        path = request.url.path
        query = str(request.query_params) if request.query_params else ""
        client_ip = self._get_client_ip(request)

        # Log request
        log_msg = f"Request: {method} {path}"
        if query:
            log_msg += f"?{query}"
        log_msg += f" | IP: {client_ip}"

        logger.info(log_msg)

        # Process request and measure latency
        start_time = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            logger.error(f"Request failed: {method} {path} | {latency_ms:.1f}ms | Error: {str(e)}")
            raise

        latency_ms = (time.perf_counter() - start_time) * 1000

        # Get user info if available (will be encrypted username)
        user_info = ""
        if hasattr(request.state, "user_id"):
            user_info = f" | User: {request.state.user_id}"

        # Log response
        logger.info(
            f"Response: {method} {path} | Status: {response.status_code} | {latency_ms:.1f}ms{user_info}"
        )

        # Add correlation ID to response headers for debugging
        response.headers["X-Correlation-ID"] = correlation_id

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP, handling proxies."""
        # Check for forwarded header (behind load balancer/proxy)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # First IP in the chain is the original client
            return forwarded.split(",")[0].strip()

        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fall back to direct client
        if request.client:
            return request.client.host

        return "unknown"

    def _get_safe_headers(self, request: Request) -> dict:
        """Get headers with sensitive values redacted."""
        safe_headers = {}
        for key, value in request.headers.items():
            if key.lower() in SENSITIVE_HEADERS:
                safe_headers[key] = "[REDACTED]"
            else:
                safe_headers[key] = value
        return safe_headers
