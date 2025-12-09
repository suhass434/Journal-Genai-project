"use client";

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Mic, MicOff } from 'lucide-react';

// Add type definition for Web Speech API
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export default function JournalEntryForm({ onEntryAdded }: { onEntryAdded: (entry: any) => void }) {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [language, setLanguage] = useState('en-US');
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = language;

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }
                    if (finalTranscript) {
                        setText(prev => prev + (prev ? ' ' : '') + finalTranscript);
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    if (event.error === 'network') {
                        alert("Network error: Voice recognition requires an active internet connection.");
                    } else if (event.error === 'not-allowed') {
                        alert("Microphone access denied. Please allow microphone permissions.");
                    } else if (event.error === 'no-speech') {
                        // Ignore no-speech error, just stop listening
                    } else {
                        alert(`Speech recognition error: ${event.error}`);
                    }
                    setIsListening(false);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }
        }
    }, [language]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.lang = language;
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        setLoading(true);
        try {
            const response = await axios.post('http://localhost:8000/api/journal', {
                raw_text: text
            });
            onEntryAdded(response.data);
            setText('');
        } catch (error) {
            console.error("Error adding entry:", error);
            alert("Failed to add entry. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto p-4 bg-white rounded-xl shadow-md border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">New Journal Entry</h2>
                <div className="flex items-center gap-2">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-black"
                        disabled={isListening}
                    >
                        <option value="en-US">English</option>
                        <option value="hi-IN">Hindi</option>
                        <option value="kn-IN">Kannada</option>
                    </select>
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        title={isListening ? "Stop Recording" : "Start Recording"}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                </div>
            </div>

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="How was your day? Type or speak..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4 text-gray-700"
                disabled={loading}
            />
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={loading || !text.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Processing...' : (
                        <>
                            <span>Save Entry</span>
                            <Send size={18} />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
