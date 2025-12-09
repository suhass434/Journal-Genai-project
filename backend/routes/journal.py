from fastapi import APIRouter, HTTPException, Body
from models.entry import JournalEntry
from database import journal_collection
from services.gemini_service import process_journal_entry, generate_embedding
from datetime import datetime

router = APIRouter()

@router.post("/journal", response_model=JournalEntry)
async def add_journal_entry(entry: JournalEntry):
    # 1. Process with Gemini
    processed_data = await process_journal_entry(entry.raw_text)
    
    if not processed_data:
        raise HTTPException(status_code=500, detail="Failed to process journal entry")
    
    # 2. Generate Embedding
    embedding = await generate_embedding(processed_data['english_text'])
    
    # 3. Prepare document
    new_entry = entry.dict()
    new_entry['english_text'] = processed_data['english_text']
    new_entry['structured_events'] = processed_data['structured_events']
    new_entry['embedding_vector'] = embedding
    new_entry['timestamp'] = datetime.now() # Ensure server-side timestamp
    
    # 4. Save to MongoDB
    result = await journal_collection.insert_one(new_entry)
    
    return new_entry

@router.get("/journal")
async def get_journal_entries():
    cursor = journal_collection.find().sort("timestamp", -1).limit(20)
    entries = await cursor.to_list(length=20)
    # Convert ObjectId to string if needed, or Pydantic handles it if configured
    # But Pydantic V2 might need help with _id. 
    # For simplicity, we can let FastAPI/Pydantic handle it or map it.
    # Let's just return the list, FastAPI JSONResponse handles dicts well.
    for entry in entries:
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
    return entries
