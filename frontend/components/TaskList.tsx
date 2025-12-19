"use client";

import { useState } from 'react';
import axios from 'axios';
import { CheckCircle, Circle, Clock, AlertTriangle, Trash2, Edit2, MoreVertical, ChevronRight } from 'lucide-react';

interface Task {
    _id: string;
    name: string;
    description?: string;
    scheduled_date: string;
    scheduled_time?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    is_quantitative: boolean;
    quantitative_progress?: {
        total: number;
        completed: number;
        unit?: string;
    };
    tags?: string[];
}

interface TaskListProps {
    tasks: Task[];
    onTaskUpdate?: () => void;
}

export default function TaskList({ tasks, onTaskUpdate }: TaskListProps) {
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
            case 'medium': return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'low': return 'bg-green-100 text-green-700 border-green-300';
            default: return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };

    const getPriorityIcon = (priority: string) => {
        if (priority === 'urgent' || priority === 'high') {
            return <AlertTriangle size={16} />;
        }
        return <Clock size={16} />;
    };

    const handleCompleteTask = async (taskId: string) => {
        try {
            await axios.post(`http://localhost:8000/api/tasks/complete`, {
                text: `completed task ${taskId}`,
                date: new Date()
            });

            if (onTaskUpdate) {
                onTaskUpdate();
            }
        } catch (error) {
            console.error('Error completing task:', error);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            await axios.delete(`http://localhost:8000/api/tasks/${taskId}`);

            if (onTaskUpdate) {
                onTaskUpdate();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        if (filter !== 'all' && task.status !== filter) return false;
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
        return true;
    });

    // Group tasks by date
    const groupedTasks = filteredTasks.reduce((groups, task) => {
        const date = task.scheduled_date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(task);
        return groups;
    }, {} as Record<string, Task[]>);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

        if (dateOnly.getTime() === todayOnly.getTime()) return 'Today';
        if (dateOnly.getTime() === tomorrowOnly.getTime()) return 'Tomorrow';

        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
                <div className="text-sm text-gray-600">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200">
                {/* Status Filter */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'completed'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Completed
                    </button>
                </div>

                {/* Priority Filter */}
                <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
            </div>

            {/* Task Groups */}
            <div className="space-y-6">
                {Object.keys(groupedTasks).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Circle size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>No tasks found</p>
                        <p className="text-sm mt-2">Add a task to get started!</p>
                    </div>
                ) : (
                    Object.entries(groupedTasks)
                        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                        .map(([date, dateTasks]) => (
                            <div key={date}>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <ChevronRight size={20} className="text-gray-400" />
                                    {formatDate(date)}
                                    <span className="text-sm font-normal text-gray-500">
                                        ({dateTasks.length})
                                    </span>
                                </h3>

                                <div className="space-y-2">
                                    {dateTasks.map((task) => (
                                        <div
                                            key={task._id}
                                            className={`border rounded-lg p-4 transition-all hover:shadow-md ${task.status === 'completed'
                                                    ? 'bg-gray-50 border-gray-200'
                                                    : 'bg-white border-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Checkbox */}
                                                <button
                                                    onClick={() => handleCompleteTask(task._id)}
                                                    className="mt-0.5 flex-shrink-0"
                                                    disabled={task.status === 'completed'}
                                                >
                                                    {task.status === 'completed' ? (
                                                        <CheckCircle className="text-green-600" size={24} />
                                                    ) : (
                                                        <Circle className="text-gray-400 hover:text-blue-600" size={24} />
                                                    )}
                                                </button>

                                                {/* Task Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1">
                                                            <h4 className={`font-medium ${task.status === 'completed'
                                                                    ? 'text-gray-500 line-through'
                                                                    : 'text-gray-900'
                                                                }`}>
                                                                {task.name}
                                                            </h4>
                                                            {task.description && (
                                                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                                            )}
                                                        </div>

                                                        {/* Priority Badge */}
                                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                                            {getPriorityIcon(task.priority)}
                                                            <span className="capitalize">{task.priority}</span>
                                                        </div>
                                                    </div>

                                                    {/* Time & Progress */}
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                        {task.scheduled_time && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={14} />
                                                                {task.scheduled_time}
                                                            </span>
                                                        )}

                                                        {task.is_quantitative && task.quantitative_progress && (
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs">
                                                                        {task.quantitative_progress.completed} / {task.quantitative_progress.total}
                                                                        {task.quantitative_progress.unit && ` ${task.quantitative_progress.unit}`}
                                                                    </span>
                                                                    <span className="text-xs font-medium">
                                                                        {Math.round((task.quantitative_progress.completed / task.quantitative_progress.total) * 100)}%
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                                                        style={{
                                                                            width: `${(task.quantitative_progress.completed / task.quantitative_progress.total) * 100}%`
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Tags */}
                                                    {task.tags && task.tags.length > 0 && (
                                                        <div className="flex gap-2 mt-2 flex-wrap">
                                                            {task.tags.map((tag, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                                                >
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <button
                                                    onClick={() => handleDeleteTask(task._id)}
                                                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete task"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
