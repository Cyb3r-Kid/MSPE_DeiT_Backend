from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Register(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class Login(BaseModel):
    email: EmailStr
    password: str


class Refresh(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class Clinical(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    sex: Literal["female", "male", "other", "unknown"] | None = None
    anatomical_location: str | None = Field(default=None, max_length=80)


class AssessmentCreate(BaseModel):
    modality: Literal["dermoscopic", "tbp_3d", "smartphone"]
    clinical_metadata: Clinical


class AssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    modality: str
    clinical_metadata: dict
    status: str
    created_at: datetime
    completed_at: datetime | None
    has_image: bool
    prediction: dict | None


class ConsentRequest(BaseModel):
    consent_type: Literal["image_storage", "research_assessment"]
    granted: bool
    consent_version: str = "1"


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
