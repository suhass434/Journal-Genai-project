"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import JournalEntryForm from '@/components/JournalEntryForm';
import QuestionForm from '@/components/QuestionForm';
import JournalCard from '@/components/JournalCard';
import TaskInput from '@/components/TaskInput';
import TaskList from '@/components/TaskList';
import TaskCompletion from '@/components/TaskCompletion';
import DailySummary from '@/components/DailySummary';
import ProductivityInsights from '@/components/ProductivityInsights';
import { Book, ListTodo } from 'lucide-react';
import { Map } from 'lucide-react';
import Link from 'next/link';
import GoalsPanel from '@/components/GoalsPanel';

export default function Home() {
  const [entries, setEntries] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'summary' | 'insights' | 'journal' | 'ask' | 'timeline' | 'goals'>('tasks');
  const [timeline, setTimeline] = useState<Record<string, any[]>>({});
  const [story, setStory] = useState<string | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);

  const fetchEntries = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/journal');
      setEntries(response.data);
    } catch (error) {
      console.error("Failed to fetch entries", error);
    }
  };

  const fetchTasks = async () => {
    try {
      // Fetch tasks for the next 7 days to show upcoming tasks
      const response = await axios.get('http://localhost:8000/api/tasks?limit=100');
      if (response.data.success) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchTasks();
  }, []);

  useEffect(() => {
    if (activeTab === 'timeline') {
      fetchTimeline();
    }
  }, [activeTab]);

  const fetchTimeline = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/timeline');
      setTimeline(res.data.timeline || {});
    } catch (err) {
      console.error('Failed to fetch timeline', err);
    }
  };

  const generateStory = async () => {
    setStoryLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/api/story', { limit: 500 });
      setStory(res.data.story || res.data.story || '');
    } catch (err) {
      console.error('Failed to generate story', err);
      setStory('Failed to generate story.');
    } finally {
      setStoryLoading(false);
    }
  };

  const handleEntryAdded = (newEntry: any) => {
    setEntries([newEntry, ...entries]);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white">
              <ListTodo size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Task Scheduler AI</h1>
          <p className="text-gray-600">Your intelligent personal productivity assistant</p>
        </header>

        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 inline-flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              📝 Tasks
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'summary'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              📊 Summary
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'insights'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              💡 Insights
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'journal'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              📔 Journal
            </button>
            <button
              onClick={() => setActiveTab('ask')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'ask'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              ❓ Ask
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {activeTab === 'tasks' ? (
            <div className="space-y-6">
              <TaskInput onTasksCreated={fetchTasks} />
              <TaskCompletion onTaskUpdate={fetchTasks} />
              <TaskList tasks={tasks} onTaskUpdate={fetchTasks} />
            </div>
          ) : activeTab === 'summary' ? (
            <DailySummary />
          ) : activeTab === 'insights' ? (
            <ProductivityInsights />
          ) : activeTab === 'journal' ? (
            <>
              <JournalEntryForm onEntryAdded={handleEntryAdded} />
              <div className="space-y-6 mt-8">
                <h3 className="text-xl font-semibold text-gray-800 ml-1">Recent Entries</h3>
                {entries.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No entries yet. Start writing!</p>
                ) : (
                  entries.map((entry, idx) => (
                    <JournalCard key={entry._id || idx} entry={entry} />
                  ))
                )}
              </div>
            </>
          ) : activeTab === 'ask' ? (
            <QuestionForm />
          ) : activeTab === 'goals' ? (
            <GoalsPanel />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800 ml-1">Timeline</h3>
                <div className="flex items-center gap-2">
                  <button onClick={fetchTimeline} className="px-3 py-1 bg-gray-100 rounded">Refresh</button>
                  <button onClick={generateStory} className="px-3 py-1 bg-green-600 text-white rounded">{storyLoading ? 'Generating...' : 'Generate Story'}</button>
                </div>
              </div>

              {story && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="font-semibold">Story</h4>
                  <div className="whitespace-pre-wrap mt-2 text-gray-800">{story}</div>
                </div>
              )}

              <div className="space-y-4">
                {Object.keys(timeline).length === 0 ? (
                  <div className="text-center text-gray-500 py-8">No timeline data yet.</div>
                ) : (
                  Object.entries(timeline).reverse().map(([date, items]) => (
                    <div key={date} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{date}</div>
                        <div className="text-sm text-gray-500">{items.length} entries</div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {items.map((it: any, i: number) => (
                          <div key={i} className="p-2 border-l-2 border-gray-100">
                            <div className="text-sm text-gray-700">{it.english_text || it.raw_text}</div>
                            <div className="text-xs text-gray-400">{String(it.timestamp)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
