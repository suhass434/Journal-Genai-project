import google.generativeai as genai
import os
import json
import re
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

model = genai.GenerativeModel('gemini-2.5-flash')


async def extract_tasks_from_text(text: str, current_date: datetime = None) -> Dict[str, Any]:
    """
    Extract tasks from natural language input.
    Identifies task names, dates, times, recurrence, and priority.
    """
    if current_date is None:
        current_date = datetime.now()
    
    current_date_str = current_date.strftime("%Y-%m-%d %A")
    current_time_str = current_date.strftime("%H:%M")
    
    prompt = f"""
    You are an intelligent task extraction assistant. Today's date is {current_date_str} and current time is {current_time_str}.
    
    Analyze the following user input and extract ALL SEPARATE TASKS mentioned:
    "{text}"
    
    CRITICAL INSTRUCTIONS:
    - Extract EACH distinct action/task as a SEPARATE task object
    - Look for conjunctions like "and", "also", "then" that indicate multiple tasks
    - Each task should be ONE specific action (e.g., "eat dinner", "buy shirts", "submit project")
    - DO NOT combine multiple actions into one task
    
    Examples of what should be SEPARATE tasks:
    - "eat chicken biryani at 5 PM" → Task 1
    - "go to Max" → Task 2  
    - "buy two t-shirts and one pant" → Task 3
    - "buy iPhone" → Task 4
    - "quiz in the test" → Task 5
    - "submit Genai project by 10 AM" → Task 6
    - "go to dinner" → Task 7
    
    For EACH task, extract:
    1. Task name (clear, actionable, ONE specific action)
    2. Scheduled date (convert relative terms like "today", "tomorrow", "next week" to actual dates)
    3. Scheduled time (if mentioned, in 24-hour format HH:MM)
    4. Due date (if different from scheduled date)
    5. Priority level: low, medium, high, or urgent (detect from keywords like "urgent", "important", "can wait")
    6. Recurrence pattern: none, daily, weekly, monthly, or custom
    7. Is this a quantitative task? (e.g., "100 questions", "50 pages")
    8. If quantitative: total amount and unit
    9. Confidence score (0.0 to 1.0) - how certain are you about the extraction?
    10. Any keywords that indicate urgency or priority
    
    Return a JSON object with this structure:
    {{
        "tasks": [
            {{
                "name": "task name (ONE specific action)",
                "description": "optional longer description",
                "scheduled_date": "YYYY-MM-DD",
                "scheduled_time": "HH:MM or null",
                "due_date": "YYYY-MM-DD or null",
                "priority": "low|medium|high|urgent",
                "recurrence": "none|daily|weekly|monthly|custom",
                "recurrence_details": "description if custom",
                "is_quantitative": true/false,
                "quantitative_total": number or null,
                "quantitative_unit": "unit name or null",
                "confidence": 0.0 to 1.0,
                "detected_keywords": ["keyword1", "keyword2"]
            }}
        ],
        "needs_clarification": true/false,
        "clarification_question": "question to ask user if unclear",
        "overall_confidence": 0.0 to 1.0
    }}
    
    IMPORTANT RULES:
    - For "today", use {current_date_str}
    - For "tomorrow", add 1 day
    - For "next week", find the next occurrence of that day
    - Create SEPARATE task objects for EACH distinct action mentioned
    - If timing is vague (e.g., "soon", "later"), set needs_clarification to true
    - If no time specified, keep scheduled_time as null
    - Default priority is "medium" unless keywords suggest otherwise
    - Be VERY generous in separating tasks - when in doubt, create separate tasks
    """
    
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_text)
        return result
    except Exception as e:
        print(f"Error extracting tasks: {e}")
        # Fallback: simple regex-based extraction
        return _fallback_task_extraction(text, current_date)


def _fallback_task_extraction(text: str, current_date: datetime) -> Dict[str, Any]:
    """
    Fallback task extraction using regex when AI fails.
    """
    # Simple patterns for common task indicators
    task_words = ["do", "complete", "finish", "attend", "teach", "project", "meeting", "class"]
    
    # Check if text contains task-like words
    has_task = any(word in text.lower() for word in task_words)
    
    if not has_task:
        return {
            "tasks": [],
            "needs_clarification": True,
            "clarification_question": "I'm not sure I understood that. Are you trying to create a task?",
            "overall_confidence": 0.3
        }
    
    # Extract basic task
    task = {
        "name": text[:100],  # Use first 100 chars as name
        "description": text if len(text) > 100 else None,
        "scheduled_date": current_date.strftime("%Y-%m-%d"),
        "scheduled_time": None,
        "due_date": None,
        "priority": "medium",
        "recurrence": "none",
        "recurrence_details": None,
        "is_quantitative": False,
        "quantitative_total": None,
        "quantitative_unit": None,
        "confidence": 0.5,
        "detected_keywords": []
    }
    
    return {
        "tasks": [task],
        "needs_clarification": False,
        "clarification_question": None,
        "overall_confidence": 0.5
    }


async def match_completion_intent(text: str, existing_tasks: List[Dict[str, Any]], date: datetime = None) -> Dict[str, Any]:
    """
    When user says they completed something, match it to existing tasks.
    """
    if date is None:
        date = datetime.now()
    
    date_str = date.strftime("%Y-%m-%d")
    
    # Create a summary of existing tasks
    tasks_summary = "\n".join([
        f"ID: {task.get('_id', 'unknown')}, Name: {task.get('name')}, Date: {task.get('scheduled_date')}, Status: {task.get('status')}"
        for task in existing_tasks
    ])
    
    prompt = f"""
    The user said: "{text}"
    
    This appears to be a completion statement (they finished something).
    
    Here are the existing tasks for {date_str}:
    {tasks_summary}
    
    Determine which task(s) they completed. Match based on:
    - Similar keywords in task name
    - Context and meaning (not just exact match)
    - Consider ONLY tasks scheduled for {date_str} or earlier
    - DO NOT match future tasks
    
    Return JSON:
    {{
        "matched_task_ids": ["id1", "id2"],
        "confidence": 0.0 to 1.0,
        "needs_clarification": true/false,
        "clarification_question": "question if unclear which task"
    }}
    
    If nothing matches well, return empty matched_task_ids and set needs_clarification to true.
    """
    
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_text)
        return result
    except Exception as e:
        print(f"Error matching completion: {e}")
        return {
            "matched_task_ids": [],
            "confidence": 0.0,
            "needs_clarification": True,
            "clarification_question": "I'm not sure which task you completed. Can you be more specific?"
        }


async def parse_progress_update(text: str, task: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse quantitative progress updates like "I finished 40 today".
    """
    task_name = task.get('name', 'this task')
    current_progress = task.get('quantitative_progress', {})
    total = current_progress.get('total', 0)
    completed = current_progress.get('completed', 0)
    
    prompt = f"""
    The user is updating progress for task: "{task_name}"
    
    Current progress: {completed} out of {total}
    
    User said: "{text}"
    
    Extract how much they completed. Return JSON:
    {{
        "amount_completed": number,
        "is_increment": true/false,  // true if "finished 40 more", false if "finished 40 total"
        "confidence": 0.0 to 1.0
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_text)
        return result
    except Exception as e:
        print(f"Error parsing progress: {e}")
        # Try regex fallback
        numbers = re.findall(r'\d+', text)
        if numbers:
            return {
                "amount_completed": int(numbers[0]),
                "is_increment": True,
                "confidence": 0.6
            }
        return {
            "amount_completed": 0,
            "is_increment": True,
            "confidence": 0.0
        }


async def suggest_task_breakdown(task_name: str, task_description: str = None) -> Dict[str, Any]:
    """
    Suggest breaking a large task into smaller subtasks.
    """
    full_text = f"{task_name}. {task_description}" if task_description else task_name
    
    prompt = f"""
    The user has a task: "{full_text}"
    
    This might be a large or complex task. Suggest breaking it into smaller, actionable steps.
    
    Return JSON:
    {{
        "should_break_down": true/false,
        "reason": "why this should/shouldn't be broken down",
        "suggested_subtasks": [
            {{
                "name": "subtask name",
                "estimated_time": "time estimate like '30 mins'"
            }}
        ]
    }}
    
    Only suggest breakdown if the task is genuinely complex (e.g., "project", "assignment", multi-step processes).
    Simple tasks like "buy milk" should not be broken down.
    """
    
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_text)
        return result
    except Exception as e:
        print(f"Error suggesting breakdown: {e}")
        return {
            "should_break_down": False,
            "reason": "Unable to analyze task complexity",
            "suggested_subtasks": []
        }


async def generate_daily_summary(tasks: List[Dict[str, Any]], date: datetime = None) -> str:
    """
    Generate end-of-day summary with celebration or encouragement.
    """
    if date is None:
        date = datetime.now()
    
    date_str = date.strftime("%A, %B %d, %Y")
    
    completed = [t for t in tasks if t.get('status') == 'completed']
    pending = [t for t in tasks if t.get('status') in ['pending', 'in_progress']]
    
    tasks_summary = {
        "completed": [t.get('name') for t in completed],
        "pending": [t.get('name') for t in pending],
        "total": len(tasks),
        "completed_count": len(completed),
        "pending_count": len(pending)
    }
    
    prompt = f"""
    Generate a warm, encouraging daily summary for {date_str}.
    
    Tasks completed: {tasks_summary['completed_count']} out of {tasks_summary['total']}
    
    Completed tasks:
    {json.dumps(tasks_summary['completed'], indent=2)}
    
    Remaining tasks:
    {json.dumps(tasks_summary['pending'], indent=2)}
    
    Write a friendly summary that:
    1. Celebrates completed tasks (use emoji if all done! 🎉)
    2. Acknowledges remaining work without being negative
    3. Is concise (2-3 sentences max)
    4. Sounds like a supportive productivity coach
    
    Return plain text, not JSON.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        if len(completed) == len(tasks) and len(tasks) > 0:
            return f"🎉 Amazing work! You completed all {len(tasks)} tasks today!"
        elif len(completed) > 0:
            return f"Great progress! You completed {len(completed)} out of {len(tasks)} tasks."
        else:
            return "Let's make tomorrow count! 💪"


async def analyze_productivity_patterns(task_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze historical task data for productivity insights.
    """
    # Prepare summary statistics
    total_tasks = len(task_history)
    completed_tasks = len([t for t in task_history if t.get('status') == 'completed'])
    
    # Group by day of week
    day_completion = {}
    for task in task_history:
        if task.get('completed_at'):
            day = datetime.fromisoformat(str(task['completed_at'])).strftime('%A')
            day_completion[day] = day_completion.get(day, 0) + 1
    
    prompt = f"""
    Analyze productivity patterns from this user's task history.
    
    Total tasks: {total_tasks}
    Completed: {completed_tasks}
    Completion rate: {(completed_tasks/total_tasks*100) if total_tasks > 0 else 0:.1f}%
    
    Tasks completed by day of week:
    {json.dumps(day_completion, indent=2)}
    
    Provide insights in JSON format:
    {{
        "most_productive_day": "day name",
        "completion_rate": percentage,
        "insights": [
            "insight 1",
            "insight 2"
        ],
        "suggestions": [
            "suggestion 1",
            "suggestion 2"
        ]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_text)
        return result
    except Exception as e:
        print(f"Error analyzing patterns: {e}")
        return {
            "most_productive_day": "Unknown",
            "completion_rate": 0.0,
            "insights": ["Not enough data to analyze patterns yet."],
            "suggestions": ["Keep tracking your tasks to unlock insights!"]
        }
