import hashlib
import os
import secrets
from datetime import timedelta

import jwt
from argon2 import PasswordHasher
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import RefreshToken, User, get_db, now

hasher = PasswordHasher()
bearer = HTTPBearer()


def secret():
    value = os.getenv("JWT_SECRET", "mspe-deit-local-development-secret-key-2026")
    if len(value) < 32:
        raise RuntimeError("JWT_SECRET must be at least 32 characters")
    return value


def access_token(user_id: int):
    expiry = now() + timedelta(minutes=int(os.getenv("ACCESS_TOKEN_MINUTES", "15")))
    return jwt.encode({"sub": str(user_id), "exp": expiry, "type": "access"}, secret(), algorithm="HS256")


def new_refresh_token(db: Session, user_id: int):
    value = secrets.token_urlsafe(48)
    db.add(RefreshToken(user_id=user_id, token_hash=hashlib.sha256(value.encode()).hexdigest(), expires_at=now() + timedelta(days=int(os.getenv("REFRESH_TOKEN_DAYS", "7")))))
    db.commit()
    return value


def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(credentials.credentials, secret(), algorithms=["HS256"])
        if payload.get("type") != "access":
            raise ValueError("wrong token type")
        user = db.get(User, int(payload["sub"]))
        if user:
            return user
    except (jwt.PyJWTError, ValueError, KeyError):
        pass
    raise HTTPException(401, "Invalid or expired access token")
