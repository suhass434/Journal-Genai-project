from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Goal(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = Field(default_factory=datetime.utcnow)
    target_date: Optional[datetime] = None
    progress: Optional[List[dict]] = None  # Each progress item: {date, note, amount}
    status: Optional[str] = "active"  # active, paused, completed
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        schema_extra = {
            "example": {
                "title": "Exercise 3x/week",
                "description": "Build a habit of exercising three times a week",
                "target_date": "2026-06-01T00:00:00Z"
            }
        }
