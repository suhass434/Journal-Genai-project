import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

model = genai.GenerativeModel('gemini-2.5-flash')
embedding_model = 'models/embedding-001'

async def process_journal_entry(text: str):
    prompt = f"""
    You are a multilingual journal assistant.
    Analyze the following journal entry:
    "{text}"

    1. Detect the language.
    2. Translate it to English.
    3. Extract structured events (date, actions, places, people, emotions).

    Return the result as a valid JSON object with the following keys:
    - language: str
    - english_text: str
    - structured_events: dict
    """
    
    try:
        response = model.generate_content(prompt)
        # Clean up code blocks if present
        cleaned_text = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_text)
        return result
    except Exception as e:
        print(f"Error processing entry: {e}")
        return None

async def generate_embedding(text: str):
    try:
        result = genai.embed_content(
            model=embedding_model,
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

async def answer_question(question: str, context_entries: list):
    context_str = "\n\n".join([
        f"Date: {entry['timestamp']}\nEntry: {entry['english_text']}" 
        for entry in context_entries
    ])
    
    prompt = f"""
    You are a highly intelligent personal memory assistant.
    User Question: "{question}"
    
    Below is the user's entire journal history. It may contain entries in various formats (structured, unstructured, short notes, long stories).
    
    Journal Entries:
    {context_str}
    
    Instructions:
    1. Read ALL the provided entries carefully.
    2. Answer the user's question comprehensively using ONLY the information from the entries.
    3. If the answer requires connecting dots across multiple entries, do so.
    4. If the answer is not found in the entries, politely state that you don't have that information.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error answering question: {e}")
        return "Sorry, I couldn't generate an answer at this time."
