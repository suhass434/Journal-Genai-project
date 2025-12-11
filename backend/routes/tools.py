from fastapi import APIRouter, Query, Body
from services import gemini_service
from services.analysis_service import search_by_embedding, generate_daily_summary_for_date, detect_habits, future_you_suggestions
from database import db
from typing import List, Dict, Any
from datetime import datetime, timedelta
from services.analysis_service import generate_story

router = APIRouter()


@router.get("/search")
async def search(q: str = Query(..., description="Natural language query"), k: int = 5):
    # 1. Generate embedding for query
    emb = await gemini_service.generate_embedding(q)
    if not emb:
        return {"results": []}
    results = await search_by_embedding(emb, top_k=k)
    return {"results": results}


@router.post("/daily_summaries/generate")
async def generate_daily_summaries(days: int = Body(7, embed=True)):
    journal_collection = db["journal_entries"]
    summaries = []
    today = datetime.utcnow().date()
    for d in range(days):
        day = today - timedelta(days=d)
        day_str = day.isoformat()
        # find entries whose timestamp date matches
        cursor = journal_collection.find({})
        entries = await cursor.to_list(length=None)
        entries_for_day = [e for e in entries if str(e.get("timestamp", "")).startswith(day_str)]
        summary = await generate_daily_summary_for_date(day_str, entries_for_day)
        summaries.append(summary)
    return {"summaries": summaries}


@router.get("/habits")
async def habits():
    journal_collection = db["journal_entries"]
    cursor = journal_collection.find()
    entries = await cursor.to_list(length=None)
    analysis = await detect_habits(entries)
    return analysis


@router.post("/future_suggestions")
async def future_suggestions(body: Dict[str, Any]):
    # Expects optional 'habits' and 'goals' in body
    habits = body.get("habits")
    goals = body.get("goals") or []
    if not habits:
        # compute habits
        journal_collection = db["journal_entries"]
        cursor = journal_collection.find()
        entries = await cursor.to_list(length=None)
        habits = await detect_habits(entries)

    try:
        suggestions = await future_you_suggestions(habits, goals)
        if not suggestions:
            suggestions = "No suggestions available at this time."
        return {"suggestions": suggestions}
    except Exception as e:
        return {"error": True, "message": str(e), "suggestions": ""}


@router.get("/timeline")
async def timeline():
    journal_collection = db["journal_entries"]
    cursor = journal_collection.find().sort("timestamp", 1)
    entries = await cursor.to_list(length=None)
    # Group by date
    timeline: Dict[str, List[Dict[str, Any]]] = {}
    for e in entries:
        ts = str(e.get("timestamp", ""))
        date = ts.split("T")[0] if "T" in ts else ts.split(" ")[0]
        timeline.setdefault(date, []).append(e)
    return {"timeline": timeline}


@router.post("/story")
async def story(body: Dict[str, Any]):
    """Generate a story from journal entries. Optional body: {start_date, end_date, limit, title}"""
    start_date = body.get("start_date")
    end_date = body.get("end_date")
    limit = int(body.get("limit", 200))
    title = body.get("title")

    journal_collection = db["journal_entries"]
    cursor = journal_collection.find().sort("timestamp", 1).limit(limit)
    entries = await cursor.to_list(length=limit)

    # Optionally filter by date strings if provided (simple ISO prefix match)
    if start_date or end_date:
        def in_range(e):
            ts = str(e.get("timestamp", ""))
            if start_date and ts < start_date:
                return False
            if end_date and ts > end_date:
                return False
            return True
        entries = [e for e in entries if in_range(e)]

    story_text = await generate_story(entries, title=title)
    return {"story": story_text}
