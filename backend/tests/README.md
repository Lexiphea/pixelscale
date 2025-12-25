# Backend Tests

This directory contains pytest test cases for the PixelScale backend.

## Running Tests

```bash
cd backend
uv run pytest tests/ -v
```

## Test Coverage

- `test_auth.py` - User registration, login, and protected routes
- `test_images.py` - Image upload/access with user ownership isolation
