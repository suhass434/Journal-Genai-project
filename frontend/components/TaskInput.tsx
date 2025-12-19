"use client";

import { useState } from 'react';
import axios from 'axios';
import { Mic, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface TaskInputProps {
    onTasksCreated?: (tasks: any[]) => void;
}

export default function TaskInput({ onTasksCreated }: TaskInputProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
    const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);

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
            setFeedback({ type: 'warning', message: 'Please enter a task or use voice input.' });
            return;
        }

        setIsLoading(true);
        setFeedback(null);
        setClarificationQuestion(null);

        try {
            const response = await axios.post('http://localhost:8000/api/tasks/extract', {
                text: input,
                voice_input: false
            });

            if (response.data.success) {
                const tasksCreated = response.data.tasks || [];

                if (tasksCreated.length > 0) {
                    setFeedback({
                        type: 'success',
                        message: `✅ Created ${tasksCreated.length} task${tasksCreated.length > 1 ? 's' : ''}!`
                    });

                    if (onTasksCreated) {
                        onTasksCreated(tasksCreated);
                    }

                    // Clear input after success
                    setTimeout(() => setInput(''), 500);
                }

                // Handle clarification
                if (response.data.needs_clarification && response.data.clarification_question) {
                    setClarificationQuestion(response.data.clarification_question);
                    setFeedback({
                        type: 'warning',
                        message: 'I need some clarification...'
                    });
                }
            } else {
                setFeedback({ type: 'error', message: 'Failed to create tasks. Please try again.' });
            }
        } catch (error: any) {
            console.error('Error creating task:', error);
            setFeedback({
                type: 'error',
                message: error.response?.data?.detail || 'Error creating tasks. Is the backend running?'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getPriorityBadgeColor = (text: string) => {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('urgent') || lowerText.includes('asap')) return 'bg-red-100 text-red-700';
        if (lowerText.includes('important')) return 'bg-orange-100 text-orange-700';
        if (lowerText.includes('low priority') || lowerText.includes('can wait')) return 'bg-green-100 text-green-700';
        return 'bg-blue-100 text-blue-700';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Tasks</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Main Input */}
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Tell me what you need to do... e.g., 'I have to finish the project today and teach students tomorrow at 2 PM'"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-400"
                        rows={3}
                        disabled={isLoading || isListening}
                    />

                    {/* Voice Button */}
                    <button
                        type="button"
                        onClick={handleVoiceInput}
                        disabled={isLoading || isListening}
                        className={`absolute right-3 top-3 p-2 rounded-lg transition-all ${isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        title="Voice Input"
                    >
                        <Mic size={20} />
                    </button>
                </div>

                {/* Quick Priority Hints */}
                {input && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Detected priority:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(input)}`}>
                            {input.toLowerCase().includes('urgent') ? 'Urgent' :
                                input.toLowerCase().includes('important') ? 'High' :
                                    input.toLowerCase().includes('can wait') ? 'Low' : 'Medium'}
                        </span>
                    </div>
                )}

                {/* Clarification Question */}
                {clarificationQuestion && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                            <div>
                                <p className="text-sm font-medium text-yellow-900">Clarification Needed</p>
                                <p className="text-sm text-yellow-700 mt-1">{clarificationQuestion}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Feedback Messages */}
                {feedback && (
                    <div className={`rounded-lg p-4 ${feedback.type === 'success' ? 'bg-green-50 border border-green-200' :
                        feedback.type === 'error' ? 'bg-red-50 border border-red-200' :
                            'bg-yellow-50 border border-yellow-200'
                        }`}>
                        <div className="flex items-start gap-3">
                            {feedback.type === 'success' ? (
                                <CheckCircle className="text-green-600 mt-0.5" size={20} />
                            ) : (
                                <AlertCircle className={`${feedback.type === 'error' ? 'text-red-600' : 'text-yellow-600'
                                    } mt-0.5`} size={20} />
                            )}
                            <p className={`text-sm ${feedback.type === 'success' ? 'text-green-800' :
                                feedback.type === 'error' ? 'text-red-800' :
                                    'text-yellow-800'
                                }`}>{feedback.message}</p>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading || isListening || !input.trim()}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Send size={20} />
                            Add Tasks
                        </>
                    )}
                </button>
            </form>

            {/* Helper Text */}
            <div className="mt-4 text-xs text-gray-500 space-y-1">
                <p>💡 <strong>Tips:</strong></p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Use "urgent" or "important" to set priority</li>
                    <li>Say "today", "tomorrow", "next Monday" for dates</li>
                    <li>Mention times like "at 2 PM" or "in the evening"</li>
                    <li>For recurring: "every day", "weekly", etc.</li>
                    <li>For quantitative: "100 questions to solve"</li>
                </ul>
            </div>
        </div>
    );
}
