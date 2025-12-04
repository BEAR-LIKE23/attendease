import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface CreateCourseFormProps {
    onSubmit: (name: string, code: string) => Promise<void>;
}

export const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit(name, code);
        setName('');
        setCode('');
        setLoading(false);
    };

    return (
        <div className="glass-card p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <BookOpen className="text-indigo-600" /> Create New Course
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Course Code</label>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="e.g. CS101"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name</label>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Intro to Computer Science"
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};
