"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import JournalEntryForm from '@/components/JournalEntryForm';
import QuestionForm from '@/components/QuestionForm';
import JournalCard from '@/components/JournalCard';
import { Book } from 'lucide-react';
import { Map } from 'lucide-react';
import Link from 'next/link';
import GoalsPanel from '@/components/GoalsPanel';

export default function Home() {
  const [entries, setEntries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'journal' | 'ask' | 'timeline' | 'goals'>('journal');
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

  useEffect(() => {
    fetchEntries();
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
            <div className="p-3 bg-blue-600 rounded-full text-white">
              <Book size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Personal Journal</h1>
          <p className="text-gray-600">Record your memories, ask about your past.</p>
        </header>

        <div className="flex justify-center mb-8">
            <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => setActiveTab('journal')}
              
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'journal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              Write Journal
            </button>
            <button
              onClick={() => setActiveTab('ask')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'ask'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              Ask a Question
            </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'goals'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Goals
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'timeline'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <span className="inline-flex items-center gap-2"><Map size={14} /> Timeline</span>
              </button>
          </div>
        </div>

        <div className="space-y-8">
          {activeTab === 'journal' ? (
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
