from fastapi import APIRouter, HTTPException, Body
from models.task import (
    Task, TaskInput, TaskCompletionInput, ProgressUpdateInput,
    DisambiguationResponse, TaskStatus, PriorityLevel
)
from database import tasks_collection, task_history_collection
from services.task_ai_service import (
    extract_tasks_from_text, match_completion_intent, parse_progress_update,
    suggest_task_breakdown, generate_daily_summary, analyze_productivity_patterns
)
from services.task_service import TaskService
from datetime import datetime, timedelta
from typing import List, Optional

router = APIRouter()
task_service = TaskService(tasks_collection, task_history_collection)


@router.post("/tasks/extract")
async def extract_tasks(task_input: TaskInput):
    """
    Extract tasks from natural language input.
    Handles complex inputs with multiple tasks, dates, and priorities.
    """
    try:
        # Extract tasks using AI
        extraction_result = await extract_tasks_from_text(
            task_input.text,
            current_date=datetime.now()
        )
        
        created_tasks = []
        
        # Create each extracted task
        for task_data in extraction_result.get('tasks', []):
            # Build task object
            task_dict = {
                "name": task_data['name'],
                "description": task_data.get('description'),
                "raw_input": task_input.text,
                "scheduled_date": task_data.get('scheduled_date'),
                "scheduled_time": task_data.get('scheduled_time'),
                "due_date": task_data.get('due_date'),
                "priority": task_data.get('priority', 'medium'),
                "status": "pending",
                "recurrence": task_data.get('recurrence', 'none'),
                "is_quantitative": task_data.get('is_quantitative', False),
                "extraction_confidence": task_data.get('confidence', 0.0),
                "detected_keywords": task_data.get('detected_keywords', []),
                "needs_clarification": extraction_result.get('needs_clarification', False)
            }
            
            # Add quantitative progress if applicable
            if task_dict['is_quantitative']:
                task_dict['quantitative_progress'] = {
                    "total": task_data.get('quantitative_total', 0),
                    "completed": 0,
                    "unit": task_data.get('quantitative_unit')
                }
            
            # Add disambiguation data if needed
            if extraction_result.get('needs_clarification'):
                task_dict['disambiguation_history'] = [{
                    "question": extraction_result.get('clarification_question'),
                    "response": None,
                    "confidence_score": extraction_result.get('overall_confidence', 0.0),
                    "timestamp": datetime.now()
                }]
            
            # Save task
            created_task = await task_service.create_task(task_dict)
            created_tasks.append(created_task)
            
            # Create recurring instances if needed
            if task_data.get('recurrence') != 'none':
                recurring_tasks = await task_service.create_recurring_tasks(created_task, occurrences=7)
                created_tasks.extend(recurring_tasks)
        
        return {
            "success": True,
            "tasks": created_tasks,
            "needs_clarification": extraction_result.get('needs_clarification', False),
            "clarification_question": extraction_result.get('clarification_question'),
            "overall_confidence": extraction_result.get('overall_confidence', 1.0)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting tasks: {str(e)}")


@router.post("/tasks/complete")
async def complete_tasks_by_intent(completion_input: TaskCompletionInput):
    """
    Mark tasks as complete using natural language.
    Matches user's statement to existing tasks.
    Also handles quantitative progress updates.
    """
    try:
        # Get tasks for the specified date (or today)
        target_date = completion_input.date or datetime.now()
        existing_tasks = await task_service.get_tasks_for_day(target_date, status="pending")
        
        # Also get in_progress and quantitative tasks
        all_tasks = await task_service.get_tasks_for_day(target_date)
        
        if not all_tasks:
            return {
                "success": False,
                "message": "No tasks found for this date.",
                "completed_tasks": [],
                "updated_tasks": []
            }
        
        # Check if this is a progress update (contains numbers)
        import re
        numbers_in_text = re.findall(r'\d+', completion_input.text)
        
        completed_tasks = []
        updated_tasks = []
        
        # Check for quantitative progress updates first
        if numbers_in_text and len(numbers_in_text) > 0:
            # Find quantitative tasks
            quantitative_tasks = [t for t in all_tasks if t.get('is_quantitative')]
            
            for task in quantitative_tasks:
                # Try to match task name in the text
                task_name_words = task['name'].lower().split()
                text_lower = completion_input.text.lower()
                
                # Check if any significant words from task name are in the text
                if any(word in text_lower for word in task_name_words if len(word) > 3):
                    # Parse and update progress
                    parse_result = await parse_progress_update(completion_input.text, task)
                    
                    if parse_result.get('amount_completed', 0) > 0:
                        updated_task = await task_service.update_quantitative_progress(
                            str(task['_id']),
                            amount=parse_result.get('amount_completed', 0),
                            is_increment=parse_result.get('is_increment', True)
                        )
                        if updated_task:
                            updated_tasks.append(updated_task)
        
        # Match completion intent for non-quantitative tasks or fully completed quantitative tasks
        match_result = await match_completion_intent(
            completion_input.text,
            existing_tasks,
            target_date
        )
        
        # Complete matched tasks
        for task_id in match_result.get('matched_task_ids', []):
            completed_task = await task_service.complete_task(task_id)
            if completed_task:
                completed_tasks.append(completed_task)
        
        return {
            "success": True,
            "completed_tasks": completed_tasks,
            "updated_tasks": updated_tasks,
            "needs_clarification": match_result.get('needs_clarification', False) if not updated_tasks else False,
            "clarification_question": match_result.get('clarification_question'),
            "confidence": match_result.get('confidence', 0.0)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error completing tasks: {str(e)}")


@router.post("/tasks/{task_id}/progress")
async def update_task_progress(task_id: str, progress_input: ProgressUpdateInput):
    """
    Update quantitative progress for a task.
    Handles natural language like "I finished 40 today".
    """
    try:
        # Get the task
        task = await task_service.get_task_by_id(task_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if not task.get('is_quantitative'):
            raise HTTPException(status_code=400, detail="Task is not quantitative")
        
        # Parse progress update
        parse_result = await parse_progress_update(progress_input.progress_text, task)
        
        # Update progress
        updated_task = await task_service.update_quantitative_progress(
            task_id,
            amount=parse_result.get('amount_completed', 0),
            is_increment=parse_result.get('is_increment', True)
        )
        
        return {
            "success": True,
            "task": updated_task,
            "confidence": parse_result.get('confidence', 0.0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating progress: {str(e)}")


@router.get("/tasks")
async def get_tasks(
    date: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 100
):
    """
    Get tasks with optional filtering.
    Query params: date (YYYY-MM-DD), status, priority, limit
    """
    try:
        filters = {}
        
        if date:
            filters['scheduled_date'] = date
        if status:
            filters['status'] = status
        if priority:
            filters['priority'] = priority
        
        tasks = await task_service.get_tasks(filters, limit=limit)
        
        return {
            "success": True,
            "count": len(tasks),
            "tasks": tasks
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tasks: {str(e)}")


@router.get("/tasks/today")
async def get_today_tasks():
    """Get all tasks for today"""
    try:
        today = datetime.now()
        tasks = await task_service.get_tasks_for_day(today)
        
        # Group by status
        pending = [t for t in tasks if t['status'] == 'pending']
        in_progress = [t for t in tasks if t['status'] == 'in_progress']
        completed = [t for t in tasks if t['status'] == 'completed']
        
        return {
            "success": True,
            "date": today.strftime("%Y-%m-%d"),
            "total": len(tasks),
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching today's tasks: {str(e)}")


@router.get("/tasks/summary")
async def get_daily_summary(date: Optional[str] = None):
    """
    Generate AI-powered daily summary with celebration or encouragement.
    """
    try:
        # Parse date or use today
        if date:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        else:
            target_date = datetime.now()
        
        # Get tasks for the day
        tasks = await task_service.get_tasks_for_day(target_date)
        
        # Generate summary using AI
        summary_text = await generate_daily_summary(tasks, target_date)
        
        # Calculate statistics
        total = len(tasks)
        completed = len([t for t in tasks if t['status'] == 'completed'])
        
        return {
            "success": True,
            "date": target_date.strftime("%Y-%m-%d"),
            "summary": summary_text,
            "statistics": {
                "total": total,
                "completed": completed,
                "pending": total - completed,
                "completion_rate": (completed / total * 100) if total > 0 else 0
            },
            "tasks": tasks
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")


@router.get("/tasks/insights")
async def get_productivity_insights(days: int = 30):
    """
    Get AI-powered productivity insights based on task history.
    """
    try:
        # Get tasks from the last N days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        stats = await task_service.get_task_statistics(start_date, end_date)
        
        # Analyze patterns using AI
        insights = await analyze_productivity_patterns(stats['tasks'])
        
        return {
            "success": True,
            "period": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
                "days": days
            },
            "statistics": {
                "total_tasks": stats['total'],
                "completed": stats['completed'],
                "completion_rate": stats['completion_rate'],
                "by_priority": stats['by_priority']
            },
            "insights": insights
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")


@router.post("/tasks/{task_id}/breakdown")
async def get_task_breakdown_suggestions(task_id: str):
    """
    Get AI suggestions for breaking down a complex task into subtasks.
    """
    try:
        task = await task_service.get_task_by_id(task_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Get breakdown suggestions
        suggestions = await suggest_task_breakdown(
            task['name'],
            task.get('description')
        )
        
        return {
            "success": True,
            "task_id": task_id,
            "should_break_down": suggestions.get('should_break_down', False),
            "reason": suggestions.get('reason'),
            "suggested_subtasks": suggestions.get('suggested_subtasks', [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating breakdown: {str(e)}")


@router.put("/tasks/{task_id}")
async def update_task(task_id: str, updates: dict = Body(...)):
    """Update a specific task"""
    try:
        updated_task = await task_service.update_task(task_id, updates)
        
        if not updated_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "success": True,
            "task": updated_task
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    try:
        success = await task_service.delete_task(task_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "success": True,
            "message": "Task deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting task: {str(e)}")


@router.get("/tasks/overdue")
async def get_overdue_tasks():
    """Get all overdue tasks"""
    try:
        overdue = await task_service.get_overdue_tasks()
        
        return {
            "success": True,
            "count": len(overdue),
            "tasks": overdue
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching overdue tasks: {str(e)}")
