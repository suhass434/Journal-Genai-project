"use client";

import React, { useState } from 'react';
import axios from 'axios';

export default function GoalForm({ onAdded }: { onAdded?: (g: any) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { title, description, target_date: targetDate ? new Date(targetDate).toISOString() : undefined };
      const res = await axios.post('http://localhost:8000/api/goals', payload);
      if (onAdded) onAdded(res.data);
      setTitle('');
      setDescription('');
      setTargetDate('');
    } catch (err) {
      console.error('Failed to create goal', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-gray-800">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">Create a Goal</h3>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Goal title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title" className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 bg-white" required />

        <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 bg-white" />

        <label className="block text-sm font-medium text-gray-700">Target date</label>
        <input value={targetDate} onChange={e => setTargetDate(e.target.value)} type="date" className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 bg-white" />

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </form>
  );
}
