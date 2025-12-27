from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from .. import crud
from ..config import get_settings
from ..database import get_db
from ..logging_config import get_logger
from ..models import User
from ..schemas import Token, UserCreate, UserLogin, UserResponse
from ..services.auth import (
    create_access_token,
    get_current_user,
    get_current_user_with_display_name,
    get_username_display,
    hash_username,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()
logger = get_logger(__name__)

limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """Register a new user. Rate limited to 5 requests per minute per IP."""
    user_display = get_username_display(user_data.username)
    
    # Check if username already exists
    if crud.get_user_by_username(db, user_data.username):
        logger.warning(f"Registration failed: username already exists | User: {user_display}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    user = crud.create_user(
        db,
        username=user_data.username,
        password=user_data.password,
    )
    logger.info(f"User registered successfully | User: {user_display}")
    return user


@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,
    db: Session = Depends(get_db),
):
    """Authenticate user and return JWT token."""
    user_display = get_username_display(user_data.username)
    
    user = crud.get_user_by_username(db, user_data.username)
    if not user or not verify_password(user_data.password, user.hashed_password):
        logger.warning(f"Login failed: invalid credentials | User: {user_display}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        logger.warning(f"Login failed: inactive user | User: {user_display}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username, "display_name": user_data.username},
        expires_delta=access_token_expires,
    )
    
    logger.info(f"User logged in successfully | User: {user_display}")
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user_data: tuple[User, str | None] = Depends(get_current_user_with_display_name),
):
    """Get current authenticated user's information."""
    user, display_name = user_data
    logger.info(f"User info requested | User: {user.username[:12]}")
    return UserResponse(
        id=user.id,
        username=display_name or user.username,
        is_active=user.is_active,
        created_at=user.created_at,
    )
