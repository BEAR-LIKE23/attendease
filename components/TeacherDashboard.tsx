import React, { useState, useEffect } from 'react';
import {
  Plus, Users, QrCode, BarChart3, Clock,
  CheckCircle, RefreshCw, XCircle, BrainCircuit, Download,
  Calendar, Search, Filter, BookOpen, Copy, User, LogOut
} from 'lucide-react';
import { ProfileModal } from './ProfileModal';
import { StudentListModal } from './teacher/StudentListModal';
import { CourseCard } from './teacher/CourseCard';
import { CreateCourseForm } from './teacher/CreateCourseForm';
import { CreateSessionForm } from './teacher/CreateSessionForm';
import { SessionList } from './teacher/SessionList';
import { ClassSession, AttendanceRecord, Course } from '../types';
import { generateAttendanceReport } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface TeacherDashboardProps {
  // Props are now optional as we fetch internally
  sessions?: ClassSession[];
  attendance?: AttendanceRecord[];
  onCreateSession?: (name: string, topic: string) => void;
  onEndSession?: (id: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = () => {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'live' | 'history' | 'courses'>('courses');
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [report, setReport] = useState<{ summary: string; insights: string[] } | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const activeSession = sessions.find(s => s.isActive);

  useEffect(() => {
    if (!user) return;

    // Fetch initial data
    const fetchData = async () => {
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (sessionsData) {
        // Map snake_case to camelCase if needed, or just cast if types match (Supabase returns snake_case by default usually, but let's assume we need to map or types are aligned)
        // For simplicity in this demo, I'll map manually to ensure type safety with our Frontend types
        const mappedSessions: ClassSession[] = sessionsData.map(s => ({
          id: s.id,
          className: s.class_name,
          topic: s.topic,
          code: s.code,
          isActive: s.is_active,
          createdAt: s.created_at
        }));
        setSessions(mappedSessions);
      }

      // Fetch Courses with enrollment count
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*, enrollments(count)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (coursesData) {
        const mappedCourses: Course[] = coursesData.map((c: any) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          enrollmentCode: c.enrollment_code,
          description: c.description,
          schedule: c.schedule,
          createdAt: c.created_at,
          studentCount: c.enrollments?.[0]?.count || 0
        }));
        setCourses(mappedCourses);
      }

      // Fetch attendance for these sessions
      // For a real app, we might paginate or only fetch active session attendance initially
      // But let's fetch all for now to keep charts working
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
      // We can filter by session_ids if needed, but RLS restricts to our sessions anyway

      if (attendanceData) {
        const mappedAttendance: AttendanceRecord[] = attendanceData.map(a => ({
          id: a.id,
          sessionId: a.session_id,
          studentName: a.student_name,
          studentId: a.student_id,
          timestamp: a.timestamp
        }));
        setAttendance(mappedAttendance);
      }
    };

    fetchData();

    // Real-time subscription for Attendance
    const subscription = supabase
      .channel('public:attendance')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, payload => {
        const newRecord = payload.new;
        // Verify if this record belongs to one of our sessions
        // We can check if session_id exists in our sessions list
        // Note: sessions state might be stale in closure, so we use functional update or check payload
        // Ideally we check against the current user's sessions. 
        // Since RLS allows us to SELECT our own attendance, we can just add it if we can verify ownership or just add it and filter later.
        // A safer way is to rely on the fact that we only care about our sessions.

        setAttendance(prev => {
          // Only add if we don't have it (dedup)
          if (prev.some(a => a.id === newRecord.id)) return prev;

          return [{
            id: newRecord.id,
            sessionId: newRecord.session_id,
            studentName: newRecord.student_name,
            studentId: newRecord.student_id,
            timestamp: newRecord.timestamp
          }, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  useEffect(() => {
    // If there is an active session, default to viewing it
    if (activeSession) {
      setActiveTab('live');
    }
  }, [activeSession]);

  const handleCreate = async (courseId: string, name: string, topic: string) => {
    if (name && topic && user) {
      // Generate a simple 6-character code (e.g., 9X2B1A)
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          created_by: user.id,
          course_id: courseId,
          class_name: name,
          topic: topic,
          code: code,
          is_active: true
        })
        .select()
        .single();

      if (data && !error) {
        const newSession: ClassSession = {
          id: data.id,
          className: data.class_name,
          topic: data.topic,
          code: data.code,
          isActive: data.is_active,
          createdAt: data.created_at
        };
        setSessions(prev => [newSession, ...prev]);
      } else {
        console.error("Error creating session:", error);
        alert("Failed to create session. Please try again.");
      }
    }
  };

  const handleCreateCourse = async (name: string, code: string) => {
    if (!user) return;

    // Generate a random 6-char enrollment code
    const enrollmentCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('courses')
      .insert({
        created_by: user.id,
        name: name,
        code: code,
        enrollment_code: enrollmentCode,
        description: 'Created via dashboard',
      })
      .select()
      .single();

    if (data && !error) {
      const newCourse: Course = {
        id: data.id,
        name: data.name,
        code: data.code,
        enrollmentCode: data.enrollment_code,
        description: data.description,
        schedule: data.schedule,
        createdAt: data.created_at
      };
      setCourses(prev => [newCourse, ...prev]);
      alert(`Course Created! Enrollment Code: ${enrollmentCode}`);
    } else {
      console.error("Error creating course:", error);
      alert(`Failed to create course: ${error?.message || JSON.stringify(error)}`);
    }
  };

  const handleEndSession = async (id: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('id', id);

    if (!error) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s));
    } else {
      console.error("Error ending session:", error);
    }
  };

  const getSessionAttendance = (sessionId: string) => {
    return attendance.filter(r => r.sessionId === sessionId);
  };

  const handleGenerateReport = async (session: ClassSession) => {
    setLoadingReport(true);
    setReport(null);
    const records = getSessionAttendance(session.id);
    const result = await generateAttendanceReport(session, records, 50); // Assume 50 total students for demo
    setReport(result);
    setLoadingReport(false);
  };

  const handleExportCSV = (session: ClassSession) => {
    const records = getSessionAttendance(session.id);
    const csvContent = [
      ['Student Name', 'Student ID', 'Timestamp', 'Session ID', 'Session Name'],
      ...records.map(r => [
        r.studentName,
        r.studentId,
        new Date(r.timestamp).toLocaleString(),
        r.sessionId,
        session.className
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${session.className.replace(/\s+/g, '_')}_Attendance.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewStudents = async (course: Course) => {
    setViewingCourse(course);
    setLoadingStudents(true);
    setEnrolledStudents([]);

    // Step 1: Fetch enrollments to get student UIDs
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('student_uid, enrolled_at')
      .eq('course_id', course.id);

    if (enrollmentData && enrollmentData.length > 0) {
      const studentIds = enrollmentData.map(e => e.student_uid);

      // Step 2: Fetch profiles for these students
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, student_id_number')
        .in('id', studentIds);

      if (profilesData) {
        // Merge data
        const students = enrollmentData.map(enrollment => {
          const profile = profilesData.find(p => p.id === enrollment.student_uid);
          return {
            name: profile?.full_name || 'Unknown',
            email: profile?.email || 'No Email',
            studentId: profile?.student_id_number || 'N/A',
            enrolledAt: enrollment.enrolled_at
          };
        });
        setEnrolledStudents(students);
      }
    } else if (enrollmentError) {
      console.error("Error fetching enrollments:", enrollmentError);
    }

    setLoadingStudents(false);
  };

  const renderCreateTab = () => (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      {activeSession ? (
        <div className="glass-panel border-l-4 border-amber-500 p-8 rounded-2xl shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-200 rounded-full opacity-20 blur-xl"></div>
          <div className="flex items-start relative z-10">
            <div className="p-3 bg-amber-100 rounded-xl mr-4">
              <Clock className="text-amber-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-900">Session in Progress</h3>
              <p className="text-amber-700 mt-2 leading-relaxed">
                You currently have an active session for <strong className="font-bold">{activeSession.className}</strong>.
                Please end this session before starting a new class.
              </p>
              <button
                onClick={() => setActiveTab('live')}
                className="mt-6 px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2"
              >
                Go to Live Session &rarr;
              </button>
            </div>
          </div>
        </div>
      ) : (
        <CreateSessionForm courses={courses} onSubmit={handleCreate} />
      )}
    </div>
  );

  const renderLiveTab = () => {
    if (!activeSession) return (
      <div className="text-center py-24 glass-panel rounded-2xl border-dashed border-2 border-gray-300 animate-fade-in-up">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-700 mb-2">No Active Session</h3>
        <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">Ready to take attendance? Start a new session to generate a QR code.</p>
        <button
          onClick={() => setActiveTab('create')}
          className="px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
        >
          Start New Session
        </button>
      </div>
    );

    const currentAttendance = getSessionAttendance(activeSession.id);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
        {/* QR Code Panel */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl shadow-xl overflow-hidden sticky top-24">
            <div className="p-6 bg-slate-900 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <h3 className="text-2xl font-bold">{activeSession.className}</h3>
              <p className="text-slate-400 text-sm mt-1 font-medium">{activeSession.topic}</p>
            </div>
            <div className="p-8 flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 transform hover:scale-105 transition-transform duration-300">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${activeSession.code}&color=1e293b`}
                  alt="Session QR"
                  className="w-64 h-64 object-contain"
                />
              </div>
              <div className="mt-8 text-center w-full">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">Manual Entry Code</p>
                <div className="bg-slate-100 py-4 px-8 rounded-xl font-mono text-4xl font-black tracking-widest text-slate-800 border-2 border-dashed border-slate-300 select-all">
                  {activeSession.code}
                </div>
              </div>
              <button
                onClick={() => handleEndSession(activeSession.id)}
                className="mt-8 w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-4 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-100"
              >
                <XCircle size={20} /> End Session
              </button>
            </div>
          </div>
        </div>

        {/* Live List Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl border-l-4 border-indigo-500">
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Present Students</p>
              <p className="text-5xl font-black text-indigo-600 mt-2">{currentAttendance.length}</p>
            </div>
            <div className="glass-card p-6 rounded-2xl border-l-4 border-purple-500">
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Session Duration</p>
              <p className="text-5xl font-black text-slate-700 mt-2">
                {Math.round((Date.now() - new Date(activeSession.createdAt).getTime()) / 60000)}<span className="text-xl text-gray-400 ml-1 font-bold">min</span>
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-sm">
              <h3 className="font-bold text-gray-800 flex items-center gap-3 text-lg">
                <Users className="text-indigo-600" size={24} /> Live Attendance Feed
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExportCSV(activeSession)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  title="Export to CSV"
                >
                  <Download size={16} /> Export
                </button>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-green-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-50 overflow-y-auto flex-1 p-2 custom-scrollbar">
              {currentAttendance.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <QrCode className="opacity-20 w-8 h-8" />
                  </div>
                  <p className="font-medium">Waiting for students to scan...</p>
                </div>
              ) : (
                currentAttendance.map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between hover:bg-indigo-50/50 transition-colors rounded-xl animate-fade-in-up">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-sm border border-white">
                        {record.studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{record.studentName}</p>
                        <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-300"></span>
                          ID: {record.studentId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCoursesTab = () => (
    <div className="max-w-4xl mx-auto animate-fade-in-up space-y-8">
      <CreateCourseForm onSubmit={handleCreateCourse} />

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.length === 0 ? (
          <div className="col-span-1 md:col-span-2 text-center py-12 bg-white/50 rounded-2xl border border-dashed border-gray-200">
            <img src="/assets/empty-courses.png" alt="No Courses" className="w-48 h-48 mx-auto mb-4 object-contain opacity-80" />
            <h4 className="text-xl font-bold text-gray-700">No courses created yet</h4>
            <p className="text-gray-500 mt-2">Create your first course to get started!</p>
          </div>
        ) : (
          courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onViewStudents={handleViewStudents}
            />
          ))
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => {
    // Basic Chart Data preparation
    const chartData = sessions.map(s => ({
      name: s.className.split(':')[0], // short name
      count: getSessionAttendance(s.id).length
    })).slice(0, 7); // Last 7 sessions

    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card p-8 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={24} /> Attendance Trends
            </h3>
            <div className="h-72 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                  />
                  <Bar dataKey="count" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} barSize={40}>
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <SessionList
            sessions={sessions}
            onSelectSession={setSelectedSession}
            selectedSessionId={selectedSession?.id}
          />
        </div>

        {/* AI Analysis Section */}
        {selectedSession && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-indigo-50 to-white p-8 border-b border-indigo-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <BrainCircuit className="text-indigo-600" /> AI Insights
                  </h3>
                  <p className="text-gray-500 mt-1">Analysis for <span className="font-semibold text-indigo-900">{selectedSession.className}</span> ({selectedSession.topic})</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleExportCSV(selectedSession)}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Download size={18} /> Export CSV
                  </button>
                  <button
                    onClick={() => handleGenerateReport(selectedSession)}
                    disabled={loadingReport}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    {loadingReport ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                    Generate Report
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8">
              {report ? (
                <div className="space-y-8 animate-fade-in-up">
                  <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                    <h4 className="font-bold text-indigo-900 mb-3 text-lg">Summary</h4>
                    <p className="text-indigo-800 leading-relaxed text-lg">{report.summary}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-800 mb-4 text-lg">Key Observations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {report.insights.map((insight, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle size={20} className="text-green-600" />
                          </div>
                          <p className="text-gray-600 font-medium leading-snug">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Select a session and click "Generate Report" to see AI analysis.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Teacher Dashboard</h1>
          <p className="text-slate-500">Manage your courses and sessions</p>
        </div>
        <div className="flex gap-3">
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
      <div className="flex justify-center mb-10">
        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-gray-200 inline-flex">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'courses' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            Courses
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            Create Session
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'live' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            Live Monitor
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            History & Insights
          </button>
        </div>
      </div>

      {activeTab === 'courses' && renderCoursesTab()}
      {activeTab === 'create' && renderCreateTab()}
      {activeTab === 'live' && renderLiveTab()}
      {activeTab === 'history' && renderHistoryTab()}

      {/* Students Modal */}
      <StudentListModal
        isOpen={!!viewingCourse}
        onClose={() => setViewingCourse(null)}
        course={viewingCourse}
        students={enrolledStudents}
        loading={loadingStudents}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdate={() => window.location.reload()}
      />
    </div>
  );
};
