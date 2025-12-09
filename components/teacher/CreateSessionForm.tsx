import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import { Course } from '../../types';

interface CreateSessionFormProps {
    courses: Course[];
    onSubmit: (courseId: string, name: string, topic: string, useDynamicQr: boolean, requireLocation: boolean) => Promise<void>;
}

export const CreateSessionForm: React.FC<CreateSessionFormProps> = ({ courses, onSubmit }) => {
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [useDynamicQr, setUseDynamicQr] = useState(false);
    const [requireLocation, setRequireLocation] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId) return;

        setLoading(true);
        await onSubmit(selectedCourseId, name, topic, useDynamicQr, requireLocation);
        setName('');
        setSelectedCourseId('');
        setTopic('');
        setUseDynamicQr(false);
        setRequireLocation(false);
        setLoading(false);
    };

    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const courseId = e.target.value;
        const course = courses.find(c => c.id === courseId);
        if (course) {
            setName(course.name);
            setSelectedCourseId(course.id);
        }
    };

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3 relative z-10">
                    <Plus className="w-8 h-8" /> Start New Session
                </h2>
                <p className="text-indigo-100 mt-2 relative z-10 text-lg">Generate a secure QR code for your class instantly.</p>
            </div>
            <div className="p-10">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">Select Course</label>
                        <select
                            value={selectedCourseId}
                            onChange={handleCourseChange}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg appearance-none"
                            required
                        >
                            <option value="" disabled>Select a course...</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.name} ({course.code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">Topic / Subject</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
                            placeholder="e.g. Week 4: React Hooks & State"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <input
                                type="checkbox"
                                id="dynamicQr"
                                checked={useDynamicQr}
                                onChange={(e) => setUseDynamicQr(e.target.checked)}
                                className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                            />
                            <label htmlFor="dynamicQr" className="text-gray-700 font-medium cursor-pointer">
                                <div>Rotating QR Code</div>
                                <div className="text-xs text-gray-500">Updates every 30s to prevent sharing</div>
                            </label>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <input
                                type="checkbox"
                                id="requireLocation"
                                checked={requireLocation}
                                onChange={(e) => setRequireLocation(e.target.checked)}
                                className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                            />
                            <label htmlFor="requireLocation" className="text-gray-700 font-medium cursor-pointer">
                                <div>Require Location</div>
                                <div className="text-xs text-gray-500">Students must be within 100m</div>
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200 shadow-md active:scale-[0.99] text-lg disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate QR Code & Start Class'}
                    </button>
                </form>
            </div>
        </div>
    );
};
