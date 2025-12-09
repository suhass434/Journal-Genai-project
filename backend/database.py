import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "journal_db"

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]
journal_collection = db["journal_entries"]

async def get_database():
    return db
