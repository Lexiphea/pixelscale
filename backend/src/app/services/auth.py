from datetime import datetime, timedelta, timezone
import hashlib

import bcrypt
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..logging_config import get_logger
from ..models import User

settings = get_settings()
logger = get_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    password_bytes = plain_password.encode("utf-8")
    hash_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hash_bytes)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def hash_username(username: str) -> str:
    """
    Create a deterministic hash of username for database lookup.
    Uses SHA256 which is deterministic (same input = same output).
    This allows us to query the database without storing plaintext usernames.
    """
    # Add a pepper for additional security (from settings)
    peppered = f"{settings.jwt_secret_key}:{username.lower()}"
    return hashlib.sha256(peppered.encode("utf-8")).hexdigest()


def get_username_display(username: str) -> str:
    """
    Get a shortened hash for logging purposes.
    Returns first 12 chars of hash for log readability.
    """
    return hash_username(username)[:12]


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def _decode_and_get_user(token: str, db: Session, return_display_name: bool = False) -> User | tuple[User, str | None]:
    """Shared helper to decode JWT token and retrieve user.
    
    If return_display_name is True, returns (user, display_name) tuple.
    Otherwise, returns just the user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        username: str | None = payload.get("sub")
        display_name: str | None = payload.get("display_name")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    if return_display_name:
        return user, display_name
    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    return _decode_and_get_user(token, db)


def get_current_user_with_display_name(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> tuple[User, str | None]:
    """Get current user along with their display name from the JWT token."""
    return _decode_and_get_user(token, db, return_display_name=True)


def get_current_user_from_token(
    token: str = Query(...),
    db: Session = Depends(get_db),
) -> User:
    return _decode_and_get_user(token, db)

