from fastapi import APIRouter, HTTPException
from models.entry import QueryRequest
from database import journal_collection
from services.gemini_service import answer_question, generate_embedding
import google.generativeai as genai

router = APIRouter()

@router.post("/query")
async def ask_question(request: QueryRequest):
    question = request.question
    
    # 1. Generate embedding for the question
    # Note: For query, task_type should be retrieval_query
    # But for simplicity using same function or need to update service
    # Let's update service or just use the one we have
    # Ideally we should search by vector, but for now let's just fetch recent entries 
    # OR implement vector search if MongoDB Atlas Vector Search is set up.
    # Since we are using standard MongoDB driver, we might not have vector search easily without Atlas setup.
    # FALLBACK: Fetch all entries (or last 50) and let Gemini filter/answer.
    # This is safer for a local setup without complex vector DB config.
    
    # Fetch all entries
    cursor = journal_collection.find().sort("timestamp", 1) # Chronological order is better for context
    entries = await cursor.to_list(length=None)
    
    if not entries:
        return {"answer": "No journal entries found to answer your question."}
    
    # 2. Ask Gemini
    answer = await answer_question(question, entries)
    
    return {"answer": answer}
