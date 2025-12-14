import React from 'react';
import { XCircle, Users } from 'lucide-react';
import { Course } from '../../types';

interface StudentListModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: Course | null;
    students: any[];
    loading: boolean;
}

export const StudentListModal: React.FC<StudentListModalProps> = ({
    isOpen,
    onClose,
    course,
    students,
    loading
}) => {
    if (!isOpen || !course) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{course.name}</h3>
                        <p className="text-sm text-gray-500">Enrolled Students</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    >
                        <XCircle size={24} />
                    </button>
                </div>
                <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">
                            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
                            Loading students...
                        </div>
                    ) : students.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No students enrolled yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Attendance</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((student, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{student.name}</td>
                                        <td className="p-4 text-gray-600 font-mono text-sm">{student.studentId}</td>
                                        <td className="p-4 text-gray-600 text-sm">{student.email}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-12 text-center text-sm font-bold rounded px-1.5 py-0.5 ${student.attendanceRate < 75
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {student.attendanceRate}%
                                                </div>
                                                {student.attendanceRate < 75 && (
                                                    <span className="text-xs text-red-500 font-medium" title="Below 75% Requirement">
                                                        ⚠ Low
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{student.attendedCount}/{student.totalSessions} sessions</p>
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">{new Date(student.enrolledAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
