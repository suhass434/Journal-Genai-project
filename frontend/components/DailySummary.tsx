"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, CheckCircle, Clock, TrendingUp, Sparkles } from 'lucide-react';

interface DailySummaryProps {
    date?: string;
}

export default function DailySummary({ date }: DailySummaryProps) {
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSummary();
    }, [date]);

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
            const params = date ? `?date=${date}` : '';
            const response = await axios.get(`http://localhost:8000/api/tasks/summary${params}`);

            if (response.data.success) {
                setSummary(response.data);
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-md p-8 border border-blue-100">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center text-gray-500">
                <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No summary available</p>
            </div>
        );
    }

    const stats = summary.statistics || {};
    const completionRate = stats.completion_rate || 0;
    const isAllDone = stats.completed > 0 && stats.pending === 0;

    return (
        <div className={`rounded-lg shadow-lg p-8 border-2 transition-all ${isAllDone
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    {isAllDone ? (
                        <Sparkles className="text-green-600" size={32} />
                    ) : (
                        <Calendar className="text-blue-600" size={32} />
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Daily Summary</h2>
                        <p className="text-sm text-gray-600">{summary.date}</p>
                    </div>
                </div>

                {isAllDone && (
                    <div className="text-4xl animate-bounce">🎉</div>
                )}
            </div>

            {/* AI Summary */}
            <div className="mb-6 p-6 bg-white/80 backdrop-blur rounded-lg border border-gray-200">
                <p className="text-lg text-gray-800 leading-relaxed">{summary.summary}</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
                        </div>
                        <Clock className="text-gray-400" size={24} />
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{stats.completed || 0}</p>
                        </div>
                        <CheckCircle className="text-green-500" size={24} />
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Rate</p>
                            <p className="text-2xl font-bold text-blue-600">{completionRate.toFixed(0)}%</p>
                        </div>
                        <TrendingUp className="text-blue-500" size={24} />
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span>Progress</span>
                    <span className="font-medium">{stats.completed} / {stats.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                        className={`h-4 rounded-full transition-all duration-500 ${isAllDone ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                            }`}
                        style={{ width: `${completionRate}%` }}
                    />
                </div>
            </div>

            {/* Pending Tasks (if any) */}
            {stats.pending > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        <strong>{stats.pending}</strong> task{stats.pending !== 1 ? 's' : ''} still pending
                    </p>
                </div>
            )}
        </div>
    );
}
