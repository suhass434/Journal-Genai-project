from typing import List, Dict, Any, Tuple
import math
from services import gemini_service
from database import db


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return -1.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return -1.0
    return dot / (norm_a * norm_b)


async def search_by_embedding(query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
    journal_collection = db["journal_entries"]
    cursor = journal_collection.find({"embedding_vector": {"$exists": True}})
    entries = await cursor.to_list(length=None)

    scored: List[Tuple[float, Dict[str, Any]]] = []
    for e in entries:
        vec = e.get("embedding_vector")
        score = _cosine(query_embedding, vec) if vec else -1.0
        scored.append((score, e))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = [item[1] for item in scored[:top_k]]
    for entry in top:
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
    return top


async def generate_daily_summary_for_date(date_str: str, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate a daily summary for a given date (YYYY-MM-DD) and store in DB."""
    if not entries:
        return {"date": date_str, "summary": "", "count": 0}

    combined = "\n\n".join([f"- {e.get('english_text') or e.get('raw_text')}" for e in entries])
    prompt = f"""
    You are a personal journaling assistant. Produce a concise daily summary for the date {date_str}.
    Use the following entries as context and produce:
    1) A one-line headline
    2) A short paragraph summary (2-3 sentences)
    3) Key tags (comma separated)

    Context entries:
    {combined}
    """

    try:
        response = gemini_service.model.generate_content(prompt)
        text = response.text
    except Exception as e:
        text = ""

    summary_doc = {"date": date_str, "summary": text, "count": len(entries)}
    daily_collection = db["daily_summaries"]
    await daily_collection.update_one({"date": date_str}, {"$set": summary_doc}, upsert=True)
    return summary_doc


async def detect_habits(entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Simple heuristic habit detection: count actions, places, repeated phrases."""
    action_counts: Dict[str, int] = {}
    place_counts: Dict[str, int] = {}
    def _label(item: Any) -> str:
        if item is None:
            return ""
        if isinstance(item, str):
            return item.strip()
        if isinstance(item, dict):
            return str(item.get("description") or item.get("type") or item)
        return str(item)
    for e in entries:
        se = e.get("structured_events") or {}
        actions = se.get("actions") or []
        places = se.get("places") or []
        if isinstance(actions, str):
            actions = [actions]
        if isinstance(places, str):
            places = [places]
        for a in actions:
            key = _label(a)
            if not key:
                continue
            action_counts[key] = action_counts.get(key, 0) + 1
        for p in places:
            key = _label(p)
            if not key:
                continue
            place_counts[key] = place_counts.get(key, 0) + 1

    top_actions = sorted(action_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_places = sorted(place_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    return {"top_actions": top_actions, "top_places": top_places}


async def future_you_suggestions(habits: Dict[str, Any], goals: List[Dict[str, Any]]) -> str:
    """Generate personalized suggestions using Gemini given habits and goals."""
    prompt = f"""
    The user has the following recurring habits and patterns:
    {habits}

    The user's goals are:
    {goals}

    Provide 5 concise, prioritized suggestions that 'Future You' would appreciate to improve progress toward goals and wellbeing.
    """
    try:
        response = gemini_service.model.generate_content(prompt)
        return response.text
    except Exception as e:
        return ""


async def generate_story(entries: List[Dict[str, Any]], title: str = None) -> str:
    """Generate a narrative/story that threads the provided entries into a readable story."""
    if not entries:
        return ""

    # Build a compact context
    context = "\n\n".join([f"Date: {e.get('timestamp')}\nEntry: {e.get('english_text') or e.get('raw_text')}" for e in entries])

    prompt = f"""
    You are a creative assistant. Given the following journal entries, weave them into a coherent, human-readable narrative story.
    If a title is provided, incorporate it as the story title; otherwise, produce a fitting headline.

    Instructions:
    - Produce a short title (one line) and then a story of 3-6 paragraphs.
    - Keep the user's voice respectful of the original entries.
    - Highlight recurring themes and meaningful moments.

    Title: {title or ''}

    Entries:
    {context}
    """

    try:
        response = gemini_service.model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating story: {e}")
        return ""
