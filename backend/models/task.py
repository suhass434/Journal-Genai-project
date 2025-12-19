from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PriorityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RecurrencePattern(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class QuantitativeProgress(BaseModel):
    """For tasks with numeric tracking (e.g., 100 questions)"""
    total: int
    completed: int = 0
    unit: Optional[str] = None  # e.g., "questions", "pages", "minutes"
    
    @property
    def remaining(self) -> int:
        return max(0, self.total - self.completed)
    
    @property
    def percentage(self) -> float:
        if self.total == 0:
            return 0.0
        return (self.completed / self.total) * 100


class DisambiguationData(BaseModel):
    """Stores clarification questions and responses"""
    question: str
    response: Optional[str] = None
    confidence_score: float  # 0.0 to 1.0
    timestamp: datetime = Field(default_factory=datetime.now)


class Task(BaseModel):
    """Main task model with comprehensive tracking"""
    # Core fields
    name: str
    description: Optional[str] = None
    raw_input: Optional[str] = None  # Original user input
    
    # Temporal fields
    created_at: datetime = Field(default_factory=datetime.now)
    scheduled_date: Optional[datetime] = None
    scheduled_time: Optional[str] = None  # "14:00" format
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Status and priority
    status: TaskStatus = TaskStatus.PENDING
    priority: PriorityLevel = PriorityLevel.MEDIUM
    
    # Recurrence
    recurrence: RecurrencePattern = RecurrencePattern.NONE
    recurrence_rule: Optional[Dict[str, Any]] = None  # Custom recurrence data
    parent_recurrence_id: Optional[str] = None  # Link to recurring task template
    
    # Progress tracking
    is_quantitative: bool = False
    quantitative_progress: Optional[QuantitativeProgress] = None
    
    # Task breakdown
    parent_task_id: Optional[str] = None
    subtasks: Optional[List[str]] = []  # List of subtask IDs
    
    # Disambiguation
    needs_clarification: bool = False
    disambiguation_history: Optional[List[DisambiguationData]] = []
    
    # Metadata
    tags: Optional[List[str]] = []
    notes: Optional[str] = None
    updated_at: Optional[datetime] = None
    
    # AI extraction metadata
    extraction_confidence: Optional[float] = None
    detected_keywords: Optional[List[str]] = []
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Complete project report",
                "description": "Finish the quarterly project report",
                "scheduled_date": "2025-12-20T09:00:00Z",
                "priority": "high",
                "status": "pending",
                "tags": ["work", "urgent"]
            }
        }


class TaskInput(BaseModel):
    """User input for task creation via natural language"""
    text: str
    voice_input: bool = False
    

class TaskCompletionInput(BaseModel):
    """User input for marking tasks complete"""
    text: str
    date: Optional[datetime] = None  # Which day's tasks to check


class ProgressUpdateInput(BaseModel):
    """User input for updating quantitative progress"""
    task_id: str
    progress_text: str  # e.g., "I finished 40 today"
    amount: Optional[int] = None  # Parsed amount


class DisambiguationResponse(BaseModel):
    """Response to clarification question"""
    task_id: str
    question_id: str
    response: str
