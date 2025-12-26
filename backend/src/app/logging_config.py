"""
Centralized logging configuration for PixelScale backend.

Provides:
- Plain text formatter with timestamps, level, module, correlation ID
- Console handler for local development
- CloudWatch handler for production (when enabled)
- Request correlation ID support
"""

import logging
import sys
from contextvars import ContextVar
from functools import lru_cache

from .config import get_settings

# Context variable for request correlation ID
correlation_id_var: ContextVar[str | None] = ContextVar("correlation_id", default=None)


class CorrelationIdFilter(logging.Filter):
    """Filter that adds correlation_id to log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = correlation_id_var.get() or "-"
        return True


class PlainTextFormatter(logging.Formatter):
    """
    Plain text formatter with timestamps and categories.
    Format: TIMESTAMP | LEVEL | MODULE | CORRELATION_ID | MESSAGE
    """

    def __init__(self):
        super().__init__(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(correlation_id)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )


class SensitiveDataFilter(logging.Filter):
    """Filter that redacts sensitive data from log messages."""

    SENSITIVE_PATTERNS = [
        "password",
        "token",
        "secret",
        "authorization",
        "cookie",
        "api_key",
        "apikey",
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            msg_lower = record.msg.lower()
            for pattern in self.SENSITIVE_PATTERNS:
                if pattern in msg_lower:
                    # Redact values after sensitive keywords
                    record.msg = self._redact_sensitive(record.msg)
                    break
        return True

    def _redact_sensitive(self, msg: str) -> str:
        """Redact sensitive values in log messages."""
        import re

        # Redact patterns like: password=xxx, token: xxx, "password": "xxx"
        patterns = [
            (r'(["\']?(?:password|token|secret|authorization|cookie|api_key|apikey)["\']?\s*[:=]\s*)["\']?[^"\'\s,}]+["\']?', r'\1[REDACTED]'),
        ]
        for pattern, replacement in patterns:
            msg = re.sub(pattern, replacement, msg, flags=re.IGNORECASE)
        return msg


def get_console_handler() -> logging.Handler:
    """Create console handler with plain text formatting."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(PlainTextFormatter())
    handler.addFilter(CorrelationIdFilter())
    handler.addFilter(SensitiveDataFilter())
    return handler


def get_cloudwatch_handler() -> logging.Handler | None:
    """Create CloudWatch handler if enabled and configured."""
    settings = get_settings()

    if not settings.use_cloudwatch:
        return None

    try:
        import watchtower
        import boto3

        # Create CloudWatch client
        client_kwargs = {"region_name": settings.aws_region}
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            client_kwargs["aws_access_key_id"] = settings.aws_access_key_id
            client_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key

        logs_client = boto3.client("logs", **client_kwargs)

        handler = watchtower.CloudWatchLogHandler(
            log_group_name=settings.cloudwatch_log_group,
            log_stream_name=settings.cloudwatch_log_stream,
            boto3_client=logs_client,
            create_log_group=True,
        )
        handler.setFormatter(PlainTextFormatter())
        handler.addFilter(CorrelationIdFilter())
        handler.addFilter(SensitiveDataFilter())
        return handler

    except ImportError:
        logging.warning("watchtower not installed, CloudWatch logging disabled")
        return None
    except Exception as e:
        logging.warning(f"Failed to initialize CloudWatch handler: {e}")
        return None


@lru_cache(maxsize=1)
def setup_logging() -> None:
    """
    Configure application-wide logging.
    Should be called once at application startup.
    """
    settings = get_settings()

    # Get log level from settings
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Configure root logger for our app
    app_logger = logging.getLogger("src.app")
    app_logger.setLevel(log_level)
    app_logger.handlers.clear()

    # Add console handler (always)
    app_logger.addHandler(get_console_handler())

    # Add CloudWatch handler (if enabled)
    cloudwatch_handler = get_cloudwatch_handler()
    if cloudwatch_handler:
        app_logger.addHandler(cloudwatch_handler)
        app_logger.info("CloudWatch logging enabled")

    # Prevent propagation to root logger
    app_logger.propagate = False

    # Also configure uvicorn access logs to use our format
    uvicorn_access = logging.getLogger("uvicorn.access")
    uvicorn_access.handlers.clear()
    uvicorn_access.addHandler(get_console_handler())
    if cloudwatch_handler:
        uvicorn_access.addHandler(cloudwatch_handler)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with proper configuration.
    Use this instead of logging.getLogger() directly.
    """
    return logging.getLogger(name)
