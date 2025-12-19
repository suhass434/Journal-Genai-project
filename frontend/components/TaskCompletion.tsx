"use client";

import { useState } from 'react';
import axios from 'axios';
import { CheckCircle, Loader2, MessageSquare, Mic } from 'lucide-react';

interface TaskCompletionProps {
    onTaskUpdate?: () => void;
}

export default function TaskCompletion({ onTaskUpdate }: TaskCompletionProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setFeedback({ type: 'error', message: 'Voice input not supported in this browser. Try Chrome or Edge.' });
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setFeedback({ type: 'warning', message: 'Listening...' });
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setIsListening(false);
            setFeedback(null);
        };

        recognition.onerror = (event: any) => {
            setIsListening(false);
            setFeedback({ type: 'error', message: `Voice input error: ${event.error}` });
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!input.trim()) {
            setFeedback({ type: 'warning', message: 'Please enter what you completed.' });
            return;
        }

        setIsLoading(true);
        setFeedback(null);

        try {
            const response = await axios.post('http://localhost:8000/api/tasks/complete', {
                text: input,
                date: new Date()
            });

            if (response.data.success) {
                const completedCount = response.data.completed_tasks?.length || 0;
                const updatedCount = response.data.updated_tasks?.length || 0;

                if (completedCount > 0 || updatedCount > 0) {
                    let message = '';
                    if (completedCount > 0) {
                        message += `✅ Marked ${completedCount} task${completedCount > 1 ? 's' : ''} as completed! `;
                    }
                    if (updatedCount > 0) {
                        message += `📊 Updated progress on ${updatedCount} task${updatedCount > 1 ? 's' : ''}!`;
                    }

                    setFeedback({
                        type: 'success',
                        message: message.trim()
                    });

                    if (onTaskUpdate) {
                        onTaskUpdate();
                    }

                    setTimeout(() => setInput(''), 500);
                } else if (response.data.needs_clarification) {
                    setFeedback({
                        type: 'warning',
                        message: response.data.clarification_question || 'No matching tasks found.'
                    });
                } else {
                    setFeedback({
                        type: 'warning',
                        message: 'No matching tasks found.'
                    });
                }
            }
        } catch (error: any) {
            console.error('Error completing task:', error);
            setFeedback({
                type: 'error',
                message: error.response?.data?.detail || 'Error updating tasks.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-4">
            <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="text-green-600" size={20} />
                <h3 className="font-semibold text-gray-900">Mark Tasks Complete</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder='e.g., "I completed the class" or "I solved 30 leetcode problems"'
                        className="w-full px-4 py-2 pr-12 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                        disabled={isLoading || isListening}
                    />

                    {/* Voice Button */}
                    <button
                        type="button"
                        onClick={handleVoiceInput}
                        disabled={isLoading || isListening}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        title="Voice Input"
                    >
                        <Mic size={18} />
                    </button>
                </div>

                {feedback && (
                    <div className={`rounded-lg p-3 text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
                        feedback.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
                            'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        }`}>
                        {feedback.message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={18} />
                            Update Tasks
                        </>
                    )}
                </button>
            </form>

            <p className="text-xs text-gray-600 mt-2">
                💡 Tell me what you finished, and I'll match it to your tasks
            </p>
        </div>
    );
}
