"use client";

import { useState } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

export default function QuestionForm() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setLoading(true);
        setAnswer('');
        try {
            const response = await axios.post('http://localhost:8000/api/query', {
                question: question
            });
            setAnswer(response.data.answer);
        } catch (error) {
            console.error("Error asking question:", error);
            setAnswer("Sorry, something went wrong while fetching the answer.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-4 bg-white rounded-xl shadow-md border border-gray-100 mt-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Ask Your Journal</h2>
            <form onSubmit={handleAsk} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., What did I do last Sunday?"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                    <Search size={18} />
                    {loading ? 'Asking...' : 'Ask'}
                </button>
            </form>

            {answer && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <h3 className="font-semibold text-purple-900 mb-2">Answer:</h3>
                    <p className="text-purple-800 whitespace-pre-wrap">{answer}</p>
                </div>
            )}
        </div>
    );
}
