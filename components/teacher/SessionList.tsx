import React from 'react';
import { Calendar } from 'lucide-react';
import { ClassSession } from '../../types';

interface SessionListProps {
    sessions: ClassSession[];
    onSelectSession: (session: ClassSession) => void;
    selectedSessionId?: string;
}

export const SessionList: React.FC<SessionListProps> = ({ sessions, onSelectSession, selectedSessionId }) => {
    const pastSessions = sessions.filter(s => !s.isActive);

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col h-[450px]">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="text-purple-600" size={24} /> Past Sessions
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {pastSessions.length === 0 ? (
                    <div className="text-center py-10">
                        <img src="/assets/empty-history.png" alt="No History" className="w-32 h-32 mx-auto mb-3 object-contain opacity-60" />
                        <p className="text-gray-400">No past sessions yet.</p>
                    </div>
                ) : (
                    pastSessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => onSelectSession(session)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedSessionId === session.id ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-sm' : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-gray-800">{session.className}</p>
                                    <p className="text-sm text-gray-500 mt-0.5">{session.topic}</p>
                                </div>
                                <span className="text-xs bg-gray-100 px-2.5 py-1 rounded-md text-gray-600 font-medium">
                                    {new Date(session.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
