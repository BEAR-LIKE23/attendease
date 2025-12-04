import React, { useState, useEffect } from 'react';
import { UserRole, ClassSession, AttendanceRecord } from './types';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { LoginPage } from './components/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GraduationCap, BookOpen, LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, signOut } = useAuth();
  const [role, setRole] = useState<UserRole>(UserRole.NONE);

  // Auto-redirect based on user role if logged in
  useEffect(() => {
    if (user && role === UserRole.NONE) {
      const userRole = user.user_metadata?.role;
      if (userRole === 'student') {
        setRole(UserRole.STUDENT);
      } else {
        setRole(UserRole.TEACHER);
      }
    }
  }, [user, role]);

  const renderRoleSelection = () => (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-50">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="text-center mb-16 z-10 animate-fade-in-up">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 text-sm font-medium text-indigo-600 shadow-sm">
          ✨ Smart Attendance Management
        </div>
        <h1 className="text-6xl font-black text-slate-900 mb-4 tracking-tight">
          Attend<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Ease</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The next-generation classroom experience. Seamless QR attendance, real-time insights, and effortless management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full px-4 z-10">
        <button
          onClick={() => setRole(UserRole.TEACHER)}
          className="group relative bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/60 flex flex-col items-center text-center overflow-hidden hover:-translate-y-2 animate-fade-in-up delay-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="w-24 h-24 bg-indigo-100 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner relative z-10">
            <BookOpen className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-3 relative z-10">Teacher Portal</h2>
          <p className="text-slate-500 relative z-10">Manage sessions, track attendance, and view AI-powered insights.</p>
          <div className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-full font-medium opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg shadow-indigo-200 relative z-10">
            Enter Dashboard &rarr;
          </div>
        </button>

        <button
          onClick={() => setRole(UserRole.STUDENT)}
          className="group relative bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/60 flex flex-col items-center text-center overflow-hidden hover:-translate-y-2 animate-fade-in-up delay-200"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="w-24 h-24 bg-emerald-100 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner relative z-10">
            <GraduationCap className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-3 relative z-10">Student Portal</h2>
          <p className="text-slate-500 relative z-10">Login to view history, check your schedule, and scan QR codes.</p>
          <div className="mt-8 px-6 py-2 bg-emerald-600 text-white rounded-full font-medium opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg shadow-emerald-200 relative z-10">
            Student Login &rarr;
          </div>
        </button>
      </div>

      <div className="mt-16 text-slate-400 text-sm font-medium animate-fade-in-up delay-300">
        &copy; {new Date().getFullYear()} AttendEase Systems. Built for the future of education.
      </div>
    </div>
  );

  // If role is selected but not logged in, show Login Page
  if (role !== UserRole.NONE && !user) {
    return (
      <>
        <div className="absolute top-4 left-4 z-50">
          <button onClick={() => setRole(UserRole.NONE)} className="text-gray-500 hover:text-gray-800 font-medium">
            &larr; Back
          </button>
        </div>
        <LoginPage />
      </>
    );
  }

  if (role === UserRole.NONE) {
    return renderRoleSelection();
  }

  // Authenticated Views
  if (role === UserRole.STUDENT) {
    return <StudentDashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRole(UserRole.NONE)}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-xl text-gray-800 hidden sm:block">AttendEase</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-600">
              Teacher Portal
            </span>
            {user && (
              <span className="text-sm text-gray-500 hidden sm:block">
                {user.email}
              </span>
            )}
            <button
              onClick={() => {
                signOut();
                setRole(UserRole.NONE);
              }}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100"
              title="Exit"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="animate-in fade-in duration-500">
        <TeacherDashboard />
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
