import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
    QrCode, History, BookOpen, LogOut, User,
    CheckCircle, Clock, Calendar, Search, Filter, Plus, XCircle, Bell, MessageSquare
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ProfileModal } from './ProfileModal';
import { Course, AttendanceRecord, Message, Notification } from '../types';
import { messageService } from '../services/messageService';
import { Toast } from './Toast';
import { calculateDistance } from '../utils/location';

export const StudentDashboard: React.FC = () => {
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'courses' | 'messages'>('scan');
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [enrollmentCode, setEnrollmentCode] = useState('');
    const [viewingHistoryCourse, setViewingHistoryCourse] = useState<string | null>(null);
    const [courseHistory, setCourseHistory] = useState<any[]>([]);
    const [loadingCourseHistory, setLoadingCourseHistory] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    useEffect(() => {
        if (activeTab === 'scan') {
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
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'history' && user) {
            fetchHistory();
        }
        if (activeTab === 'courses' && user) {
            fetchCourses();
        }
        if (activeTab === 'messages' && user) {
            fetchMessages();
        }
        if (user) {
            fetchNotifications();
        }
    }, [activeTab, user]);

    const fetchNotifications = async () => {
        try {
            const data = await messageService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    const fetchMessages = async () => {
        setLoadingMessages(true);
        try {
            // Fetch messages for all enrolled courses
            // Since we don't have a direct "get all messages" API, we iterate over courses
            // Or better, update service to fetch all messages for enrolled courses
            // For now, let's just fetch courses first if empty
            let currentCourses = courses;
            if (currentCourses.length === 0) {
                // Quick fetch if needed, or rely on existing state if already fetched
                // Let's assume courses are fetched or we fetch them now
                const { data } = await supabase.from('enrollments').select('course_id').eq('student_uid', user?.id);
                if (data) {
                    const courseIds = data.map(d => d.course_id);
                    // Now fetch messages for these courses
                    if (courseIds.length > 0) {
                        const { data: msgs, error } = await supabase
                            .from('messages')
                            .select('*, courses(name, code)')
                            .in('course_id', courseIds)
                            .order('created_at', { ascending: false });

                        if (error) throw error;
                        if (msgs) setMessages(msgs as any);
                    } else {
                        setMessages([]);
                    }
                }
            } else {
                const courseIds = currentCourses.map(c => c.id);
                if (courseIds.length > 0) {
                    const { data: msgs, error } = await supabase
                        .from('messages')
                        .select('*, courses(name, code)')
                        .in('course_id', courseIds)
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    if (msgs) setMessages(msgs as any);
                } else {
                    setMessages([]);
                }
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await messageService.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Error marking read:", error);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                *,
                sessions (
                    class_name,
                    topic,
                    is_active
                )
            `)
            .eq('student_uid', user?.id)
            .order('timestamp', { ascending: false });

        if (data) {
            setHistory(data);
        }
        setLoadingHistory(false);
    };

    const fetchCourses = async () => {
        const { data, error } = await supabase
            .from('enrollments')
            .select(`
                course_id,
                courses (
                    id,
                    name,
                    code,
                    description,
                    schedule
                )
            `)
            .eq('student_uid', user?.id);

        if (data) {
            setCourses(data.map((d: any) => d.courses));
        }
    };

    const onScanSuccess = (decodedText: string) => {
        setScanResult(decodedText);
        handleAttendance(decodedText);
    };

    const onScanFailure = (error: any) => {
        // handle scan failure, usually better to ignore and keep scanning.
    };

    const logScanAttempt = async (
        sessionId: string,
        status: 'success' | 'failed',
        reason?: string,
        lat?: number | null,
        lng?: number | null
    ) => {
        try {
            await supabase.from('scan_logs').insert({
                session_id: sessionId,
                student_uid: user?.id,
                status,
                failure_reason: reason,
                latitude: lat,
                longitude: lng,
                device_info: navigator.userAgent
            });
        } catch (e) {
            console.error("Failed to log scan attempt", e);
        }
    };

    const handleAttendance = async (code: string) => {
        setToast(null);
        let currentSessionId = '';
        let lat: number | null = null;
        let lng: number | null = null;

        try {
            // 1. Find the session
            const { data: session, error: sessionError } = await supabase
                .from('sessions')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .single();

            if (sessionError || !session) throw new Error("Invalid or inactive session code.");

            currentSessionId = session.id;

            // 2. Check if already marked
            const { data: existing, error: checkError } = await supabase
                .from('attendance')
                .select('*')
                .eq('session_id', session.id)
                .eq('student_uid', user?.id)
                .single();

            if (existing) throw new Error("You have already marked attendance for this session.");

            // 3. Check for cooldown (30 minutes)
            const { data: lastAttendance } = await supabase
                .from('attendance')
                .select('timestamp')
                .eq('student_uid', user?.id)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            if (lastAttendance) {
                const lastTime = new Date(lastAttendance.timestamp).getTime();
                const now = new Date().getTime();
                const diffMinutes = (now - lastTime) / (1000 * 60);
                if (diffMinutes < 30) {
                    throw new Error(`Please wait ${Math.ceil(30 - diffMinutes)} minutes before scanning into another class.`);
                }
            }

            // 4. Validation: Location & Metadata
            let distance: number | null = null;
            const deviceInfo = navigator.userAgent;

            if (session.max_distance_meters && session.latitude && session.longitude) {
                try {
                    setToast({ type: 'info', message: 'Verifying location...' });
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 5000,
                            maximumAge: 0
                        });
                    });
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;

                    distance = calculateDistance(lat, lng, session.latitude, session.longitude);

                    if (distance > session.max_distance_meters) {
                        throw new Error(`You are too far from the class! Distance: ${Math.round(distance)}m (Max: ${session.max_distance_meters}m)`);
                    }

                } catch (error: any) {
                    if (error.code === 1) throw new Error("Location access denied. Please enable location to mark attendance.");
                    if (error.message?.includes("too far")) throw error;
                    // validation failed logic
                    throw new Error("Could not verify location. Please ensure GPS is enabled.");
                }
            }


            // 5. Mark attendance
            const { error: insertError } = await supabase
                .from('attendance')
                .insert([
                    {
                        session_id: session.id,
                        student_uid: user?.id,
                        student_name: user?.user_metadata?.full_name || user?.email,
                        student_id: user?.user_metadata?.student_id_number || 'N/A',
                        timestamp: new Date().toISOString(),
                        latitude: lat,
                        longitude: lng,
                        device_info: deviceInfo,
                        distance_from_session: distance
                    }
                ]);

            if (insertError) throw insertError;

            await logScanAttempt(session.id, 'success', undefined, lat, lng);
            setToast({ type: 'success', message: `Attendance marked for ${session.class_name}!` });
            setScanResult(null); // Reset scan result to allow re-scan if needed (though usually one per session)

        } catch (error: any) {
            setToast({ type: 'error', message: error.message });
            if (currentSessionId) {
                await logScanAttempt(currentSessionId, 'failed', error.message, lat, lng);
            }
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode) {
            handleAttendance(manualCode);
        }
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        setToast(null);

        try {
            const { data: course, error: courseError } = await supabase
                .from('courses')
                .select('id, name')
                .eq('enrollment_code', enrollmentCode)
                .single();

            if (courseError || !course) throw new Error("Invalid enrollment code.");

            const { error: enrollError } = await supabase
                .from('enrollments')
                .insert([
                    {
                        course_id: course.id,
                        student_uid: user?.id,
                        enrolled_at: new Date().toISOString()
                    }
                ]);

            if (enrollError) {
                if (enrollError.code === '23505') throw new Error("You are already enrolled in this course.");
                throw enrollError;
            }

            setToast({ type: 'success', message: `Successfully enrolled in ${course.name}!` });
            setEnrollmentCode('');
            fetchCourses(); // Refresh list

        } catch (error: any) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const handleViewHistory = async (courseId: string) => {
        setViewingHistoryCourse(courseId);
        setLoadingCourseHistory(true);
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select(`
                    id,
                    timestamp,
                    sessions (
                        class_name,
                        topic,
                        is_active
                    )
                `)
                .eq('student_uid', user?.id)
                .eq('sessions.course_id', courseId as any) // This might require a join if session doesn't have course_id directly, but schema says it does? Wait, schema check: sessions has course_id?
                // Actually, let's check schema. sessions table usually links to course.
                // If not, we filter by session IDs belonging to the course.
                // Let's assume for now we fetch all attendance and filter in memory or better, fix query.
                // Re-reading schema from memory: sessions table has created_by, but maybe not course_id if ad-hoc?
                // Wait, previous implementation of TeacherDashboard used sessions created by user.
                // Let's assume we just show ALL history for now or if we want course specific...
                // Actually, let's just fetch all attendance for the student and filter by course if possible.
                // But wait, the previous implementation of handleViewHistory in StudentDashboard (before I overwrote it)
                // was fetching attendance where session -> course_id matches.
                // Let's try to do a nested filter.
                // Supabase doesn't support deep filtering easily on one go without foreign keys setup perfectly.
                // Alternative: Fetch all sessions for the course, then fetch attendance for those sessions.
                // OR: Fetch attendance and expand sessions, then filter in JS (easier for small data).
                ;

            // Let's stick to the previous logic which seemed to be:
            // Fetch all attendance for the student and filter in JS to avoid join filtering issues
            const { data: historyData, error: historyError } = await supabase
                .from('attendance')
                .select(`
                    id,
                    timestamp,
                    sessions (
                        id,
                        class_name,
                        topic,
                        is_active,
                        course_id
                    )
                `)
                .eq('student_uid', user?.id)
                .order('timestamp', { ascending: false });

            if (historyError) throw historyError;

            // Filter by courseId
            const filteredHistory = historyData?.filter((record: any) => record.sessions?.course_id === courseId) || [];
            setCourseHistory(filteredHistory);

        } catch (error) {
            console.error("Error fetching course history:", error);
        } finally {
            setLoadingCourseHistory(false);
        }
    };


    const renderScanTab = () => (
        <div className="max-w-2xl mx-auto animate-fade-in-up">
            <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
                    <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Scan Attendance Code</h2>
                    <p className="text-slate-400 relative z-10">Point your camera at the QR code displayed by the teacher</p>
                </div>

                <div className="p-8">


                    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 mb-8">
                        <div id="reader" className="overflow-hidden rounded-xl"></div>
                    </div>

                    <div className="relative flex py-5 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium uppercase tracking-wider">Or enter manually</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <form onSubmit={handleManualSubmit} className="flex gap-3">
                        <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            placeholder="Enter 6-digit code"
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-center text-lg tracking-widest uppercase"
                        />
                        <button
                            type="submit"
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
                        >
                            Submit
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );

    const renderHistoryTab = () => (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                        <History className="text-indigo-600" /> Attendance History
                    </h3>
                    <div className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                        Total: {history.length}
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {loadingHistory ? (
                        <div className="p-12 text-center text-gray-400">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No attendance records found.</p>
                        </div>
                    ) : (
                        history.map((record) => (
                            <div key={record.id} className="p-5 hover:bg-indigo-50/30 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <CheckCircle size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            {record.sessions?.class_name || 'Unknown Class'}
                                            {record.sessions?.is_active && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 animate-pulse">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                    LIVE
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-500">{record.sessions?.topic || 'No topic'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-600">
                                        {new Date(record.timestamp).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-400 font-mono">
                                        {new Date(record.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    const renderCoursesTab = () => (
        <div className="max-w-4xl mx-auto animate-fade-in-up space-y-8">
            {/* Enroll Section */}
            <div className="glass-card p-8 rounded-2xl border-l-4 border-indigo-500">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Plus className="text-indigo-600" /> Join a New Course
                </h3>
                <form onSubmit={handleEnroll} className="flex gap-4">
                    <input
                        type="text"
                        value={enrollmentCode}
                        onChange={(e) => setEnrollmentCode(e.target.value)}
                        placeholder="Enter Course Enrollment Code"
                        className="flex-1 px-5 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <button
                        type="submit"
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
                    >
                        Join Course
                    </button>
                </form>

            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 text-center py-12 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h4 className="text-xl font-bold text-gray-700">No courses yet</h4>
                        <p className="text-gray-500 mt-2">Join a course to see it here!</p>
                    </div>
                ) : (
                    courses.map(course => (
                        <div key={course.id} className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                                    <BookOpen className="text-indigo-600 w-6 h-6" />
                                </div>
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                                    {course.code}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{course.name}</h3>
                            <p className="text-gray-500 text-sm mb-6 line-clamp-2">{course.description || "No description provided."}</p>

                            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                                <div className="text-xs text-gray-400 font-medium">
                                    {course.schedule || "TBA"}
                                </div>
                                <button
                                    onClick={() => handleViewHistory(course.id)}
                                    className="text-indigo-600 text-sm font-bold hover:text-indigo-800 flex items-center gap-1"
                                >
                                    View History &rarr;
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Course History Modal */}
            {viewingHistoryCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <History className="text-indigo-600" size={20} /> Course Attendance
                            </h3>
                            <button
                                onClick={() => setViewingHistoryCourse(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                            {loadingCourseHistory ? (
                                <div className="p-12 text-center text-gray-400">Loading...</div>
                            ) : courseHistory.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <p>No attendance records for this course.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {courseHistory.map((record) => (
                                        <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-800 flex items-center gap-2">
                                                    {record.sessions?.class_name || 'Unknown Class'}
                                                    {record.sessions?.is_active && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 animate-pulse">
                                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                            LIVE
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-sm text-gray-500">{record.sessions?.topic || 'No Topic'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Present</span>
                                                <p className="text-xs text-gray-400 mt-1">{new Date(record.timestamp).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                            <button
                                onClick={() => setViewingHistoryCourse(null)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderMessagesTab = () => (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                        <MessageSquare className="text-indigo-600" /> Course Announcements
                    </h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {loadingMessages ? (
                        <div className="p-12 text-center text-gray-400">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No announcements yet.</p>
                        </div>
                    ) : (
                        messages.map((msg: any) => (
                            <div key={msg.id} className="p-6 hover:bg-indigo-50/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md">
                                        {msg.courses?.code}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(msg.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-2">{msg.title}</h4>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 text-center md:text-left">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800">Student Dashboard</h1>
                    <p className="text-slate-500">Track your attendance and courses</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto justify-center items-center">
                    {/* Notifications Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 text-slate-600 hover:bg-indigo-50 rounded-full transition-colors relative"
                        >
                            <Bell size={24} />
                            {notifications.some(n => !n.isRead) && (
                                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                                <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                                    <h4 className="font-bold text-gray-700">Notifications</h4>
                                    <span className="text-xs text-gray-500">{notifications.filter(n => !n.isRead).length} new</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 text-sm">No notifications</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => handleMarkRead(n.id)}
                                                className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                                                    <div>
                                                        <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{n.title}</p>
                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                                                        <p className="text-[10px] text-gray-400 mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        <User size={18} />
                        <span>Profile</span>
                    </button>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Dashboard Nav */}
            <div className="flex justify-start md:justify-center mb-10 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-gray-200 inline-flex min-w-max">
                    <button
                        onClick={() => setActiveTab('scan')}
                        className={`px-6 md:px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'scan' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                    >
                        Scan Code
                    </button>
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`px-6 md:px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'courses' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                    >
                        My Courses
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 md:px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                    >
                        History
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`px-6 md:px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'messages' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                    >
                        Messages
                    </button>
                </div>
            </div>

            {activeTab === 'scan' && renderScanTab()}
            {activeTab === 'courses' && renderCoursesTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'messages' && renderMessagesTab()}

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                user={user}
                onUpdate={() => window.location.reload()}
            />
        </div>
    );
};
