"use client";

import React from 'react';
import axios from 'axios';

interface Goal {
  _id?: string;
  title: string;
  description?: string;
  status?: string;
  target_date?: string;
  progress?: { date?: string; note?: string; amount?: number }[];
}

export default function GoalCard({ goal, onUpdated }: { goal: Goal; onUpdated?: (g: any) => void }) {
  const markComplete = async () => {
    if (!goal._id) return;
    try {
      const res = await axios.patch(`http://localhost:8000/api/goals/${goal._id}`, { status: 'completed' });
      if (onUpdated) onUpdated(res.data);
    } catch (err) {
      console.error('Failed to mark goal complete', err);
    }
  };

  const isCompleted = (goal.status || '').toLowerCase() === 'completed';

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`text-lg font-semibold ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{goal.title}</h4>
          {goal.description && <p className="text-sm text-gray-600">{goal.description}</p>}
          <div className="text-xs text-gray-500 mt-2">Status: {goal.status || 'active'}</div>
        </div>
        <div className="text-right text-sm text-gray-500">
          {goal.target_date && <div>Target: {new Date(goal.target_date).toLocaleDateString()}</div>}
        </div>
      </div>

      {goal.progress && goal.progress.length > 0 && (
        <div className="mt-3 text-sm text-gray-700">
          <div className="font-medium text-gray-600">Progress</div>
          <ul className="list-disc list-inside">
            {goal.progress.map((p, i) => (
              <li key={i}>{p.note || p.amount || 'Update'} — {p.date ? new Date(p.date).toLocaleDateString() : ''}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {isCompleted ? (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Completed</span>
        ) : (
          <button onClick={markComplete} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Mark Complete</button>
        )}
      </div>
    </div>
  );
}
