from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class JournalEntry(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    raw_text: str
    english_text: Optional[str] = None
    structured_events: Optional[Dict[str, Any]] = None
    embedding_vector: Optional[List[float]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "raw_text": "Aaj main market gaya.",
                "english_text": "Today I went to the market.",
                "structured_events": {
                    "action": "went",
                    "place": "market"
                }
            }
        }

class QueryRequest(BaseModel):
    question: str
