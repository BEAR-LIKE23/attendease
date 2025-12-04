import React, { useState, useEffect } from 'react';
import { QrCode, History, BookOpen, Calendar, CheckCircle, XCircle, LogOut } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Course } from '../types';

interface AttendanceRecord {
    id: string;
    session_id: string;
    timestamp: string;
    sessions: {
        class_name: string;
        topic: string;
    };
}

export const StudentDashboard: React.FC = () => {
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'courses'>('scan');
    const [sessionCode, setSessionCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollmentCode, setEnrollmentCode] = useState('');
    const [loadingCourses, setLoadingCourses] = useState(false);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        } else if (activeTab === 'courses') {
            fetchCourses();
        }
    }, [activeTab]);

    const fetchCourses = async () => {
        setLoadingCourses(true);
        try {
            const { data, error } = await supabase
                .from('enrollments')
                .select(`
                    course_id,
                    courses (
                        id,
                        name,
                        code,
                        description,
                        schedule,
                        created_at
                    )
                `)
                .eq('student_uid', user?.id);

            if (error) throw error;

            if (data) {
                const mappedCourses: Course[] = data.map((item: any) => ({
                    id: item.courses.id,
                    name: item.courses.name,
                    code: item.courses.code,
                    enrollmentCode: '', // Not needed for student view usually, or hidden
                    description: item.courses.description,
                    schedule: item.courses.schedule,
                    createdAt: item.courses.created_at
                }));
                setCourses(mappedCourses);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoadingCourses(false);
        }
    };

    useEffect(() => {
        if (showScanner && activeTab === 'scan') {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);

            return () => {
                scanner.clear().catch(error => console.error("Failed to clear scanner", error));
            };
        }
    }, [showScanner, activeTab]);

    const onScanSuccess = (decodedText: string) => {
        setSessionCode(decodedText);
        setShowScanner(false);
    };

    const onScanFailure = (error: any) => {
        // console.warn(`Code scan error = ${error}`);
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select(`
          id,
          timestamp,
          session_id,
          sessions (
            class_name,
            topic
          )
        `)
                .eq('student_uid', user?.id)
                .order('timestamp', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            // 1. Verify Session Code
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .select('id, is_active, class_name')
                .eq('code', sessionCode)
                .single();

            if (sessionError || !sessionData) {
                throw new Error('Invalid session code');
            }

            if (!sessionData.is_active) {
                throw new Error('This session has ended');
            }

            // 2. Record Attendance
            // We use the logged-in user's ID directly
            const { error: attendanceError } = await supabase
                .from('attendance')
                .insert([
                    {
                        session_id: sessionData.id,
                        student_uid: user?.id,
                        student_name: user?.user_metadata?.full_name || 'Unknown',
                        student_id: user?.user_metadata?.student_id_number || 'Unknown',
                    },
                ]);

            if (attendanceError) {
                if (attendanceError.code === '23505') {
                    throw new Error('You have already checked in to this session');
                }
                throw attendanceError;
            }

            setStatus('success');
            setMessage(`Successfully checked in to ${sessionData.class_name}!`);
            setSessionCode('');
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            // 1. Find Course by Enrollment Code
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('id, name')
                .eq('enrollment_code', enrollmentCode.toUpperCase())
                .single();

            if (courseError || !courseData) {
                throw new Error('Invalid enrollment code');
            }

            // 2. Create Enrollment
            const { error: enrollError } = await supabase
                .from('enrollments')
                .insert({
                    course_id: courseData.id,
                    student_uid: user?.id
                });

            if (enrollError) {
                if (enrollError.code === '23505') {
                    throw new Error('You are already enrolled in this course');
                }
                throw enrollError;
            }

            setStatus('success');
            setMessage(`Successfully enrolled in ${courseData.name}!`);
            setEnrollmentCode('');
            fetchCourses(); // Refresh list
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
            {/* Mobile Header */}
            <div className="md:hidden bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <h1 className="font-black text-xl text-slate-800">AttendEase</h1>
                <button onClick={signOut} className="text-slate-500 hover:text-red-500">
                    <LogOut size={20} />
                </button>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Desktop Header */}
                <div className="hidden md:flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Student Portal</h1>
                        <p className="text-slate-500">Welcome back, {user?.user_metadata?.full_name}</p>
                    </div>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>

                {/* Mobile Welcome */}
                <div className="md:hidden mb-6 mt-2">
                    <h2 className="text-2xl font-bold text-slate-800">Hello, {user?.user_metadata?.full_name?.split(' ')[0]}</h2>
                    <p className="text-slate-500 text-sm">Ready to learn something new?</p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex bg-white p-1 rounded-xl shadow-sm mb-6 sticky top-16 md:static z-0">
                    <button
                        onClick={() => setActiveTab('scan')}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'scan' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <QrCode size={18} />
                        <span className="hidden md:inline">Scan Code</span>
                        <span className="md:hidden">Scan</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <History size={18} />
                        <span className="hidden md:inline">History</span>
                        <span className="md:hidden">History</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'courses' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <BookOpen size={18} />
                        <span className="hidden md:inline">My Courses</span>
                        <span className="md:hidden">Courses</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="animate-fade-in-up">
                    {activeTab === 'scan' && (
                        <div className="glass-card p-6 md:p-8 rounded-2xl shadow-lg max-w-md mx-auto">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                    <QrCode size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Check In</h2>
                                <p className="text-slate-500">Scan the QR code or enter the 6-digit code</p>
                            </div>

                            {showScanner ? (
                                <div className="mb-6">
                                    <div id="reader" className="rounded-xl overflow-hidden shadow-lg"></div>
                                    <button
                                        onClick={() => setShowScanner(false)}
                                        className="mt-4 text-red-500 font-medium hover:underline"
                                    >
                                        Cancel Scanning
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="w-full mb-6 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    <QrCode size={20} /> Scan with Camera
                                </button>
                            )}

                            <div className="relative flex py-2 items-center mb-6">
                                <div className="flex-grow border-t border-gray-200"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR ENTER CODE</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>

                            <form onSubmit={handleCheckIn} className="space-y-6">
                                <div>
                                    <input
                                        type="text"
                                        value={sessionCode}
                                        onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                                        placeholder="ENTER CODE"
                                        className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-normal"
                                        maxLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={sessionCode.length < 6 || status === 'loading'}
                                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Checking In...
                                        </>
                                    ) : (
                                        'Check In Now'
                                    )}
                                </button>
                            </form>

                            {status !== 'idle' && (
                                <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    {status === 'success' ? <CheckCircle className="shrink-0" /> : <XCircle className="shrink-0" />}
                                    <div>
                                        <p className="font-bold">{status === 'success' ? 'Success!' : 'Error'}</p>
                                        <p className="text-sm opacity-90">{message}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            {loadingHistory ? (
                                <div className="text-center py-12 text-slate-400">Loading history...</div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                                    <img src="/assets/empty-history.png" alt="No History" className="w-48 h-48 mx-auto mb-4 object-contain opacity-80" />
                                    <p className="text-slate-500 font-medium text-lg">No attendance records yet</p>
                                    <p className="text-sm text-slate-400 mt-1">Your check-in history will appear here.</p>
                                </div>
                            ) : (
                                history.map((record) => (
                                    <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{record.sessions.class_name}</h3>
                                            <p className="text-sm text-slate-500">{record.sessions.topic}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full inline-block mb-1">
                                                Present
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                {new Date(record.timestamp).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'courses' && (
                        <div className="space-y-8">
                            {/* Enrollment Card */}
                            <div className="glass-card p-6 md:p-8 rounded-2xl shadow-lg">
                                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                    <BookOpen className="text-indigo-600" /> My Courses
                                </h2>

                                <form onSubmit={handleEnroll} className="flex gap-4 mb-8">
                                    <input
                                        type="text"
                                        value={enrollmentCode}
                                        onChange={(e) => setEnrollmentCode(e.target.value)}
                                        placeholder="Enter Course Enrollment Code"
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={status === 'loading'}
                                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                                    >
                                        {status === 'loading' ? 'Joining...' : 'Join Course'}
                                    </button>
                                </form>

                                {status !== 'idle' && message && (
                                    <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {status === 'success' ? <CheckCircle className="shrink-0" /> : <XCircle className="shrink-0" />}
                                        <p className="font-medium">{message}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {loadingCourses ? (
                                        <p className="text-slate-400 col-span-2 text-center py-8">Loading courses...</p>
                                    ) : courses.length === 0 ? (
                                        <div className="col-span-2 text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            <img src="/assets/empty-courses.png" alt="No Courses" className="w-48 h-48 mx-auto mb-4 object-contain opacity-80" />
                                            <p className="text-slate-500 font-medium text-lg">No courses yet</p>
                                            <p className="text-sm text-slate-400 mt-1">Enter a code above to join your first class!</p>
                                        </div>
                                    ) : (
                                        courses.map(course => (
                                            <div key={course.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                                <h3 className="font-bold text-lg text-slate-800">{course.code}</h3>
                                                <p className="text-slate-600 font-medium">{course.name}</p>
                                                <p className="text-sm text-slate-400 mt-2">{course.description}</p>
                                                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-sm text-slate-500">
                                                    <span>{course.schedule || 'No schedule'}</span>
                                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-bold text-xs">Enrolled</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
