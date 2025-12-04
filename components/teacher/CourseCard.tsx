import React from 'react';
import { Calendar, Users, Copy } from 'lucide-react';
import { Course } from '../../types';

interface CourseCardProps {
    course: Course;
    onViewStudents: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onViewStudents }) => {
    return (
        <div className="glass-card p-6 rounded-2xl border-l-4 border-indigo-500 hover:shadow-lg transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-xl font-bold text-gray-800">{course.code}</h4>
                    <p className="text-gray-600">{course.name}</p>
                </div>
                <div className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Enrollment Code</p>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-black text-indigo-900">{course.enrollmentCode}</span>
                        <button
                            onClick={() => navigator.clipboard.writeText(course.enrollmentCode)}
                            className="text-indigo-400 hover:text-indigo-600"
                            title="Copy Code"
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 border-t border-gray-100 pt-4">
                <span className="flex items-center gap-1">
                    <Calendar size={14} /> {new Date(course.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                    <Users size={14} /> {course.studentCount || 0} Students
                </span>
                <button
                    onClick={() => onViewStudents(course)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold hover:underline"
                >
                    View Students
                </button>
            </div>
        </div>
    );
};
