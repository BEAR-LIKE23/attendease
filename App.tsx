import React, { useState, useEffect } from 'react';
import { UserRole, ClassSession, AttendanceRecord } from './types';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { LoginPage } from './components/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GraduationCap, BookOpen, LogOut, CheckCircle, Users, TrendingUp, Bell, Award } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-50">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-indigo-50/50 to-transparent -z-10"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-purple-50/50 to-transparent -z-10 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-4 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 py-12">

        {/* Left Column: Text & Actions */}
        <div className="flex-1 max-w-2xl z-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white border border-indigo-100 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-sm font-bold text-indigo-900 tracking-wide uppercase">Next-Gen Classroom</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
            Attendance <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Made Simple.</span>
          </h1>

          <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-lg">
            Experience the future of education management. Seamless QR check-ins, real-time insights, and effortless course tracking.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg">
            <button
              onClick={() => setRole(UserRole.TEACHER)}
              className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-50 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BookOpen className="w-24 h-24 text-indigo-600 transform rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">Teacher Portal</h3>
                <p className="text-sm text-slate-500 mb-4">Manage classes & insights</p>
                <div className="flex items-center text-indigo-600 font-bold text-sm group-hover:gap-2 transition-all">
                  Access Dashboard <span className="opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setRole(UserRole.STUDENT)}
              className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-emerald-50 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <GraduationCap className="w-24 h-24 text-emerald-600 transform -rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
                  <GraduationCap size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">Student Portal</h3>
                <p className="text-sm text-slate-500 mb-4">Join courses & scan QR</p>
                <div className="flex items-center text-emerald-600 font-bold text-sm group-hover:gap-2 transition-all">
                  Student Login <span className="opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Hero Image */}
        <div className="flex-1 relative z-10 animate-fade-in-up delay-200 hidden lg:block">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl transform scale-90"></div>
            <img
              src="/assets/hero-3d.png"
              alt="Future Classroom"
              className="relative z-10 w-full max-w-2xl mx-auto drop-shadow-2xl hover:scale-[1.02] transition-transform duration-500"
            />

            {/* Floating Badge 1 */}
            <div className="absolute -top-8 -right-8 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 animate-blob animation-delay-2000">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Status</p>
                  <p className="font-bold text-slate-800">Attendance Marked</p>
                </div>
              </div>
            </div>

            {/* Floating Badge 2 */}
            <div className="absolute bottom-12 -left-12 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 animate-blob">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Live Class</p>
                  <p className="font-bold text-slate-800">CS101: Active</p>
                </div>
              </div>
            </div>

            {/* Floating Badge 3 */}
            <div className="absolute top-1/2 -right-12 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 animate-blob animation-delay-4000">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Engagement</p>
                  <p className="font-bold text-slate-800">98% Active</p>
                </div>
              </div>
            </div>

            {/* Floating Badge 4 */}
            <div className="absolute top-12 -left-8 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 animate-blob delay-1000">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Reminder</p>
                  <p className="font-bold text-slate-800">Next: 2:00 PM</p>
                </div>
              </div>
            </div>

            {/* Floating Badge 5 */}
            <div className="absolute bottom-8 -right-8 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 animate-blob delay-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <Award size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Rating</p>
                  <p className="font-bold text-slate-800">Top Rated 4.9</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center py-6 text-slate-400 text-sm font-medium animate-fade-in-up delay-300">
        &copy; {new Date().getFullYear()} AttendEase Systems. Built for the future.
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
