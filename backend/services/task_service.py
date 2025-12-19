from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from bson import ObjectId


class TaskService:
    """Business logic for task operations"""
    
    def __init__(self, tasks_collection, task_history_collection):
        self.tasks_collection = tasks_collection
        self.task_history_collection = task_history_collection
    
    async def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task and save to database"""
        # Add timestamps
        task_data['created_at'] = datetime.now()
        task_data['updated_at'] = datetime.now()
        
        # Insert into database
        result = await self.tasks_collection.insert_one(task_data)
        task_data['_id'] = str(result.inserted_id)
        
        # Log to history
        await self._log_history(task_data['_id'], "created", task_data)
        
        return task_data
    
    async def get_task_by_id(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get a single task by ID"""
        try:
            task = await self.tasks_collection.find_one({"_id": ObjectId(task_id)})
            if task:
                task['_id'] = str(task['_id'])
            return task
        except:
            return None
    
    async def get_tasks(self, filters: Dict[str, Any] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get tasks with optional filtering"""
        query = filters or {}
        
        cursor = self.tasks_collection.find(query).sort("scheduled_date", 1).limit(limit)
        tasks = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for task in tasks:
            task['_id'] = str(task['_id'])
        
        return tasks
    
    async def get_tasks_by_date_range(self, start_date: datetime, end_date: datetime, status: str = None) -> List[Dict[str, Any]]:
        """Get tasks within a date range"""
        query = {
            "scheduled_date": {
                "$gte": start_date.strftime("%Y-%m-%d"),
                "$lte": end_date.strftime("%Y-%m-%d")
            }
        }
        
        if status:
            query["status"] = status
        
        return await self.get_tasks(query)
    
    async def get_tasks_for_day(self, date: datetime, status: str = None) -> List[Dict[str, Any]]:
        """Get all tasks for a specific day"""
        date_str = date.strftime("%Y-%m-%d")
        query = {"scheduled_date": date_str}
        
        if status:
            query["status"] = status
        
        return await self.get_tasks(query)
    
    async def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a task"""
        try:
            updates['updated_at'] = datetime.now()
            
            result = await self.tasks_collection.update_one(
                {"_id": ObjectId(task_id)},
                {"$set": updates}
            )
            
            if result.modified_count > 0:
                # Log to history
                await self._log_history(task_id, "updated", updates)
                return await self.get_task_by_id(task_id)
            
            return None
        except:
            return None
    
    async def complete_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Mark a task as completed"""
        updates = {
            "status": "completed",
            "completed_at": datetime.now()
        }
        
        task = await self.update_task(task_id, updates)
        
        if task:
            await self._log_history(task_id, "completed", {"completed_at": datetime.now()})
        
        return task
    
    async def update_quantitative_progress(self, task_id: str, amount: int, is_increment: bool = True) -> Optional[Dict[str, Any]]:
        """Update progress for quantitative tasks"""
        task = await self.get_task_by_id(task_id)
        
        if not task or not task.get('is_quantitative'):
            return None
        
        progress = task.get('quantitative_progress', {})
        current_completed = progress.get('completed', 0)
        
        if is_increment:
            new_completed = current_completed + amount
        else:
            new_completed = amount
        
        # Cap at total
        total = progress.get('total', 0)
        new_completed = min(new_completed, total)
        
        updates = {
            "quantitative_progress.completed": new_completed
        }
        
        # If reached 100%, mark as completed
        if new_completed >= total:
            updates["status"] = "completed"
            updates["completed_at"] = datetime.now()
        
        return await self.update_task(task_id, updates)
    
    async def delete_task(self, task_id: str) -> bool:
        """Delete a task"""
        try:
            await self._log_history(task_id, "deleted", {})
            result = await self.tasks_collection.delete_one({"_id": ObjectId(task_id)})
            return result.deleted_count > 0
        except:
            return False
    
    async def create_recurring_tasks(self, template_task: Dict[str, Any], occurrences: int = 7) -> List[Dict[str, Any]]:
        """Generate recurring task instances"""
        created_tasks = []
        
        recurrence = template_task.get('recurrence', 'none')
        if recurrence == 'none':
            return []
        
        base_date_str = template_task.get('scheduled_date')
        if not base_date_str:
            return []
        
        base_date = datetime.strptime(base_date_str, "%Y-%m-%d")
        
        # Determine interval
        if recurrence == 'daily':
            delta = timedelta(days=1)
        elif recurrence == 'weekly':
            delta = timedelta(weeks=1)
        elif recurrence == 'monthly':
            delta = timedelta(days=30)  # Approximate
        else:
            return []
        
        # Create instances
        for i in range(1, occurrences + 1):
            next_date = base_date + (delta * i)
            
            new_task = template_task.copy()
            new_task['scheduled_date'] = next_date.strftime("%Y-%m-%d")
            new_task['parent_recurrence_id'] = str(template_task.get('_id'))
            new_task.pop('_id', None)  # Remove ID so new one is generated
            
            created = await self.create_task(new_task)
            created_tasks.append(created)
        
        return created_tasks
    
    async def get_overdue_tasks(self) -> List[Dict[str, Any]]:
        """Get all overdue tasks"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        query = {
            "scheduled_date": {"$lt": today},
            "status": {"$in": ["pending", "in_progress"]}
        }
        
        return await self.get_tasks(query)
    
    async def get_task_statistics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get task completion statistics for analysis"""
        tasks = await self.get_tasks_by_date_range(start_date, end_date)
        
        total = len(tasks)
        completed = len([t for t in tasks if t.get('status') == 'completed'])
        pending = len([t for t in tasks if t.get('status') in ['pending', 'in_progress']])
        
        # Group by priority
        by_priority = {}
        for task in tasks:
            priority = task.get('priority', 'medium')
            by_priority[priority] = by_priority.get(priority, 0) + 1
        
        return {
            "total": total,
            "completed": completed,
            "pending": pending,
            "completion_rate": (completed / total * 100) if total > 0 else 0,
            "by_priority": by_priority,
            "tasks": tasks
        }
    
    async def _log_history(self, task_id: str, action: str, data: Dict[str, Any]):
        """Log task changes to history collection"""
        history_entry = {
            "task_id": task_id,
            "action": action,
            "data": data,
            "timestamp": datetime.now()
        }
        await self.task_history_collection.insert_one(history_entry)
