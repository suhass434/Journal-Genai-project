"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Target, Calendar, Lightbulb, BarChart3, AlertCircle } from 'lucide-react';

export default function ProductivityInsights() {
    const [insights, setInsights] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        fetchInsights();
    }, [days]);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`http://localhost:8000/api/tasks/insights?days=${days}`);

            if (response.data.success) {
                setInsights(response.data);
            }
        } catch (error) {
            console.error('Error fetching insights:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center text-gray-500">
                <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No insights available yet</p>
                <p className="text-sm mt-2">Complete more tasks to unlock insights!</p>
            </div>
        );
    }

    const stats = insights.statistics || {};
    const insightData = insights.insights || {};

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingUp className="text-purple-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Productivity Insights</h2>
                        <p className="text-sm text-gray-600">
                            Last {days} days • {stats.total_tasks || 0} tasks
                        </p>
                    </div>
                </div>

                {/* Time Range Selector */}
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                </select>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <Target size={18} />
                        <span className="text-sm font-medium">Completion Rate</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">
                        {stats.completion_rate?.toFixed(0) || 0}%
                    </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                        <Calendar size={18} />
                        <span className="text-sm font-medium">Completed</span>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{stats.completed || 0}</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 text-purple-700 mb-2">
                        <TrendingUp size={18} />
                        <span className="text-sm font-medium">Total Tasks</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">{stats.total_tasks || 0}</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 text-orange-700 mb-2">
                        <BarChart3 size={18} />
                        <span className="text-sm font-medium">Best Day</span>
                    </div>
                    <p className="text-lg font-bold text-orange-900">
                        {insightData.most_productive_day || 'N/A'}
                    </p>
                </div>
            </div>

            {/* Priority Breakdown */}
            {stats.by_priority && Object.keys(stats.by_priority).length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <BarChart3 size={16} />
                        Tasks by Priority
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(stats.by_priority).map(([priority, count]: [string, any]) => (
                            <div key={priority} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                <span className="text-sm capitalize text-gray-700">{priority}</span>
                                <span className="text-lg font-bold text-gray-900">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI-Generated Insights */}
            {insightData.insights && insightData.insights.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Lightbulb className="text-yellow-500" size={20} />
                        Key Insights
                    </h3>
                    {insightData.insights.map((insight: string, idx: number) => (
                        <div key={idx} className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                            <p className="text-sm text-blue-900">{insight}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* AI-Generated Suggestions */}
            {insightData.suggestions && insightData.suggestions.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Target className="text-green-500" size={20} />
                        Suggestions
                    </h3>
                    {insightData.suggestions.map((suggestion: string, idx: number) => (
                        <div key={idx} className="flex gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                            <span className="text-green-600 flex-shrink-0 font-bold">💡</span>
                            <p className="text-sm text-green-900">{suggestion}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {(!insightData.insights || insightData.insights.length === 0) &&
                (!insightData.suggestions || insightData.suggestions.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                        <Lightbulb size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Not enough data yet</p>
                        <p className="text-sm mt-2">Keep using the app to unlock personalized insights!</p>
                    </div>
                )}
        </div>
    );
}
