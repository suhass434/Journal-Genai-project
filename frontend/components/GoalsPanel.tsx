"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import GoalForm from './GoalForm';
import GoalCard from './GoalCard';
import FutureYouCard from './FutureYouCard';

export default function GoalsPanel() {
  const [goals, setGoals] = useState<any[]>([]);

  const fetchGoals = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/goals');
      setGoals(res.data);
    } catch (err) {
      console.error('Failed to fetch goals', err);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleAdded = (g: any) => {
    setGoals([g, ...goals]);
  };

  const handleUpdated = (updated: any) => {
    setGoals((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <GoalForm onAdded={handleAdded} />

          <div className="grid grid-cols-1 gap-4 mt-4">
            {goals.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No goals yet. Create one above.</div>
            ) : (
              goals.map((g) => <GoalCard key={g._id || g.title} goal={g} onUpdated={handleUpdated} />)
            )}
          </div>
        </div>

        <div className="md:col-span-1">
          <FutureYouCard goals={goals} />
        </div>
      </div>
    </div>
  );
}
