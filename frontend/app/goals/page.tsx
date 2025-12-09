"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import GoalCard from '@/components/GoalCard';
import GoalForm from '@/components/GoalForm';
import FutureYouCard from '@/components/FutureYouCard';

export default function GoalsPage() {
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

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-gray-600">Track progress and get AI-driven suggestions later.</p>
        </header>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <GoalForm onAdded={handleAdded} />

              <div className="grid grid-cols-1 gap-4 mt-4">
                {goals.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">No goals yet. Create one above.</div>
                ) : (
                  goals.map((g) => <GoalCard key={g._id || g.title} goal={g} />)
                )}
              </div>
            </div>

            <div className="md:col-span-1">
              <FutureYouCard goals={goals} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
