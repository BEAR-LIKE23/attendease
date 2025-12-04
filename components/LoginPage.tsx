import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Mail, Lock, Loader2, ArrowRight, AlertCircle, GraduationCap, BookOpen, User } from 'lucide-react';

type AuthRole = 'teacher' | 'student';

export const LoginPage: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [role, setRole] = useState<AuthRole>('teacher');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: role,
                            student_id_number: role === 'student' ? studentId : null,
                        },
                    },
                });
                if (error) throw error;
                alert('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="glass-card w-full max-w-md p-8 rounded-2xl shadow-xl animate-fade-in-up">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-slate-800 mb-2">
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-slate-500">
                        {isSignUp ? `Join AttendEase as a ${role === 'teacher' ? 'Teacher' : 'Student'}` : 'Sign in to your account'}
                    </p>
                </div>

                {isSignUp && (
                    <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                        <button
                            type="button"
                            onClick={() => setRole('teacher')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${role === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <BookOpen size={16} /> Teacher
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('student')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${role === 'student' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <GraduationCap size={16} /> Student
                        </button>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-6">
                    {isSignUp && (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        placeholder="John Doe"
                                        required
                                    />
                                    <div className="absolute left-3 top-3.5 text-gray-400">
                                        <User size={18} />
                                    </div>
                                </div>
                            </div>

                            {role === 'student' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Student ID Number</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                            placeholder="e.g. 2023001"
                                            required
                                        />
                                        <div className="absolute left-3 top-3.5 text-gray-400">
                                            <GraduationCap size={18} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder={role === 'teacher' ? "teacher@school.edu" : "student@school.edu"}
                                required
                            />
                            <div className="absolute left-3 top-3.5 text-gray-400">
                                <Mail size={18} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                            <div className="absolute left-3 top-3.5 text-gray-400">
                                <Lock size={18} />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 ${role === 'student' && isSignUp ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className={`font-medium hover:underline text-sm ${role === 'student' && isSignUp ? 'text-emerald-600' : 'text-indigo-600'}`}
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};
