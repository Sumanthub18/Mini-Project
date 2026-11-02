"""
Pydantic validators and schemas for Scam or Safe Day 3 backend.
Validates input requests and normalizes AI provider responses.
"""
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ScamAnalyzeRequest(BaseModel):
    message: str = Field(..., min_length=3, max_length=10000, description="Message text to analyze for scam indicators")
    provider: Optional[str] = Field("auto", description="Target provider: auto, groq, gemini, or mistral")
    include_contextual: Optional[bool] = Field(False, description="Whether to invoke secondary contextual model")

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty or only whitespace")
        return trimmed

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: Optional[str]) -> str:
        valid = {"auto", "groq", "gemini", "mistral"}
        val = (v or "auto").lower()
        if val not in valid:
            raise ValueError(f"Invalid provider '{v}'. Must be one of: {', '.join(valid)}")
        return val


class ScamCompareRequest(BaseModel):
    message: str = Field(..., min_length=3, max_length=10000, description="Message text to compare across providers")
    providers: Optional[List[str]] = Field(
        default=["groq", "gemini", "mistral"],
        description="List of providers to query in parallel"
    )

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty or only whitespace")
        return trimmed

    @field_validator("providers")
    @classmethod
    def validate_providers(cls, v: Optional[List[str]]) -> List[str]:
        if not v:
            return ["groq", "gemini", "mistral"]
        valid = {"groq", "gemini", "mistral"}
        cleaned = []
        for p in v:
            p_lower = p.strip().lower()
            if p_lower in valid and p_lower not in cleaned:
                cleaned.append(p_lower)
        if not cleaned:
            raise ValueError("At least one valid provider must be selected (groq, gemini, mistral)")
        return cleaned


class RiskIndicator(BaseModel):
    title: str = Field(..., description="Short title of the warning/threat indicator")
    phrase: str = Field("", description="Specific phrase or pattern detected")
    explanation: str = Field(..., description="Why this phrase/behavior is suspicious")
    severity: str = Field("medium", description="Severity level: low, medium, high, or critical")

    @field_validator("severity")
    @classmethod
    def normalize_severity(cls, v: str) -> str:
        val = v.lower()
        if val not in {"low", "medium", "high", "critical"}:
            return "medium"
        return val


class StandardizedAIResponse(BaseModel):
    provider: str
    model: str
    summary: str
    scam_category: str
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: str = Field(..., description="low, medium, or high")
    risk_indicators: List[RiskIndicator] = Field(default_factory=list)
    rule_findings: List[RiskIndicator] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    execution_time_ms: float = 0.0
    fallback_used: bool = False
    is_scam: bool = False

