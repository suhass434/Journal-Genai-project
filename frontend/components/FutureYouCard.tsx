"use client";

import React, { useState } from 'react';
import axios from 'axios';

export default function FutureYouCard({ goals }: { goals: any[] }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/api/future_suggestions', { goals });
      if (res.data && res.data.error) {
        setSuggestions(res.data.message || 'Error generating suggestions.');
      } else {
        setSuggestions(res.data.suggestions || res.data.suggestion || String(res.data));
      }
    } catch (err) {
      console.error('Failed to fetch suggestions', err);
      setSuggestions('Failed to fetch suggestions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Future You Suggestions</h3>
        <button onClick={fetchSuggestions} className="px-3 py-1 bg-indigo-600 text-white rounded">{loading ? 'Thinking...' : 'Get Suggestions'}</button>
      </div>

      {suggestions ? (
        <div className="whitespace-pre-wrap text-gray-800">{suggestions}</div>
      ) : (
        <div className="text-sm text-gray-500">Click "Get Suggestions" to receive AI-driven, prioritized suggestions based on your goals and habits.</div>
      )}
    </div>
  );
}
