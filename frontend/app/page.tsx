"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import JournalEntryForm from '@/components/JournalEntryForm';
import QuestionForm from '@/components/QuestionForm';
import JournalCard from '@/components/JournalCard';
import { Book } from 'lucide-react';

export default function Home() {
  const [entries, setEntries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'journal' | 'ask'>('journal');

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
          ) : (
            <QuestionForm />
          )}
        </div>
      </div>
    </main>
  );
}
