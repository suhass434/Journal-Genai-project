from fastapi import APIRouter, HTTPException
from models.goal import Goal
from database import db
from typing import List
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.post("/goals")
async def create_goal(goal: Goal):
    goals_collection = db["goals"]
    doc = goal.dict()
    doc["created_at"] = datetime.utcnow()
    result = await goals_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("/goals")
async def list_goals():
    goals_collection = db["goals"]
    cursor = goals_collection.find().sort("created_at", -1)
    items = await cursor.to_list(length=100)
    for g in items:
        if "_id" in g:
            g["_id"] = str(g["_id"])
    return items


@router.get("/goals/{goal_id}")
async def get_goal(goal_id: str):
    goals_collection = db["goals"]
    g = await goals_collection.find_one({"_id": ObjectId(goal_id)})
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    g["_id"] = str(g["_id"])
    return g


@router.patch("/goals/{goal_id}")
async def update_goal(goal_id: str, payload: dict):
    goals_collection = db["goals"]
    payload["updated_at"] = datetime.utcnow()
    result = await goals_collection.update_one({"_id": ObjectId(goal_id)}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    g = await goals_collection.find_one({"_id": ObjectId(goal_id)})
    g["_id"] = str(g["_id"])
    return g


@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str):
    goals_collection = db["goals"]
    result = await goals_collection.delete_one({"_id": ObjectId(goal_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"deleted": True}


@router.post("/goals/{goal_id}/progress")
async def add_progress(goal_id: str, payload: dict):
    goals_collection = db["goals"]
    entry = {
        "date": datetime.utcnow().isoformat(),
        "note": payload.get("note"),
        "amount": payload.get("amount")
    }
    result = await goals_collection.update_one({"_id": ObjectId(goal_id)}, {"$push": {"progress": entry}, "$set": {"updated_at": datetime.utcnow()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    g = await goals_collection.find_one({"_id": ObjectId(goal_id)})
    g["_id"] = str(g["_id"])
    return g
