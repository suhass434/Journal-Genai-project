import { Calendar, MapPin, Activity, Smile } from 'lucide-react';

interface JournalEntry {
    timestamp: string;
    raw_text: string;
    english_text: string;
    structured_events: {
        date?: string;
        actions?: Array<string | { type?: string; description?: string }>;
        places?: Array<string | { type?: string; description?: string }>;
        people?: Array<string | { type?: string; description?: string }>;
        emotions?: Array<string | { type?: string; description?: string }>;
    };
}

export default function JournalCard({ entry }: { entry: JournalEntry }) {
    const date = new Date(entry.timestamp).toLocaleString();

    const renderLabel = (item: string | { type?: string; description?: string }) => {
        if (typeof item === 'string') return item;
        return item.description ?? item.type ?? JSON.stringify(item);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Calendar size={16} />
                <span>{date}</span>
            </div>

            <p className="text-gray-800 text-lg mb-4 leading-relaxed">
                {entry.english_text}
            </p>

            {entry.raw_text !== entry.english_text && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic border-l-4 border-gray-300">
                    "{entry.raw_text}"
                </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
                {entry.structured_events?.emotions?.map((emotion, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                        <Smile size={12} /> {renderLabel(emotion)}
                    </span>
                ))}
                {entry.structured_events?.places?.map((place, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                        <MapPin size={12} /> {renderLabel(place)}
                    </span>
                ))}
                {entry.structured_events?.actions?.map((action, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        <Activity size={12} /> {renderLabel(action)}
                    </span>
                ))}
            </div>
        </div>
    );
}
