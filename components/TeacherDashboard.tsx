import React, { useState, useEffect } from 'react';
import {
  Plus, Users, QrCode, BarChart3, Clock,
  CheckCircle, RefreshCw, XCircle, BrainCircuit, Download,
  Calendar, Search, Filter, BookOpen, Copy
} from 'lucide-react';
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
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'live' | 'history' | 'courses'>('courses');
  const [newClassName, setNewClassName] = useState('');
  const [newClassTopic, setNewClassTopic] = useState('');
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [report, setReport] = useState<{ summary: string; insights: string[] } | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

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

      // Fetch Courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (coursesData) {
        const mappedCourses: Course[] = coursesData.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          enrollmentCode: c.enrollment_code,
          description: c.description,
          schedule: c.schedule,
          createdAt: c.created_at
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName && newClassTopic && user) {
      // Generate a simple 6-character code (e.g., 9X2B1A)
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          created_by: user.id,
          class_name: newClassName,
          topic: newClassTopic,
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
        setNewClassName('');
        setNewClassTopic('');
      } else {
        console.error("Error creating session:", error);
        alert("Failed to create session. Please try again.");
      }
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Generate a random 6-char enrollment code
    const enrollmentCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('courses')
      .insert({
        created_by: user.id,
        name: newClassName,
        code: newClassTopic, // Using topic input as Course Code (e.g. CS101)
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
      setNewClassName('');
      setNewClassTopic('');
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
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3 relative z-10">
              <Plus className="w-8 h-8" /> Start New Session
            </h2>
            <p className="text-indigo-100 mt-2 relative z-10 text-lg">Generate a secure QR code for your class instantly.</p>
          </div>
          <div className="p-10">
            <form onSubmit={handleCreate} className="space-y-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">Class Name</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
                  placeholder="e.g. CS101: Intro to Computer Science"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">Topic / Subject</label>
                <input
                  type="text"
                  value={newClassTopic}
                  onChange={(e) => setNewClassTopic(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
                  placeholder="e.g. Week 4: React Hooks & State"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200 shadow-md active:scale-[0.99] text-lg"
              >
                Generate QR Code & Start Class
              </button>
            </form>
          </div>
        </div>
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
      {/* Create Course Card */}
      <div className="glass-card p-8 rounded-2xl">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <BookOpen className="text-indigo-600" /> Create New Course
        </h3>
        <form onSubmit={handleCreateCourse} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Course Code</label>
            <input
              type="text"
              value={newClassTopic} // Reusing state
              onChange={(e) => setNewClassTopic(e.target.value)}
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
                value={newClassName} // Reusing state
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. Intro to Computer Science"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      </div>

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
            <div key={course.id} className="glass-card p-6 rounded-2xl border-l-4 border-indigo-500 hover:shadow-lg transition-all">
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
                  <Users size={14} /> 0 Students {/* Placeholder for enrollment count */}
                </span>
              </div>
            </div>
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

          <div className="glass-card p-8 rounded-2xl flex flex-col h-[450px]">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="text-purple-600" size={24} /> Past Sessions
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {sessions.filter(s => !s.isActive).length === 0 ? (
                <div className="text-center py-10">
                  <img src="/assets/empty-history.png" alt="No History" className="w-32 h-32 mx-auto mb-3 object-contain opacity-60" />
                  <p className="text-gray-400">No past sessions yet.</p>
                </div>
              ) : (
                sessions.filter(s => !s.isActive).map(session => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedSession?.id === session.id ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-sm' : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'}`}
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
    </div>
  );
};
