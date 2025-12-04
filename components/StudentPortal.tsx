import React, { useState } from 'react';
import { QrCode, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { QrScanner } from './QrScanner';
import { supabase } from '../services/supabaseClient';

interface StudentPortalProps {
  onMarkAttendance: (name: string, studentId: string, code: string) => Promise<boolean>;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ onMarkAttendance }) => {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !studentId.trim() || !sessionCode.trim()) {
      setMessage("All fields are required.");
      setStatus('ERROR');
      return;
    }

    setStatus('LOADING');
    try {
      // 1. Verify Session Code
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, is_active')
        .eq('code', sessionCode.trim().toUpperCase())
        .single();

      if (sessionError || !sessionData) {
        setStatus('ERROR');
        setMessage("Invalid Session Code.");
        return;
      }

      if (!sessionData.is_active) {
        setStatus('ERROR');
        setMessage("Session is closed.");
        return;
      }

      // 2. Mark Attendance
      const { error: attendanceError } = await supabase
        .from('attendance')
        .insert({
          session_id: sessionData.id,
          student_name: name,
          student_id: studentId,
          timestamp: new Date().toISOString()
        });

      if (attendanceError) {
        if (attendanceError.code === '23505') { // Unique constraint violation
          setStatus('SUCCESS');
          setMessage("You have already marked attendance.");
        } else {
          throw attendanceError;
        }
      } else {
        setStatus('SUCCESS');
        setMessage("Attendance marked successfully!");
      }

    } catch (err: any) {
      console.error("Attendance Error:", err);
      setStatus('ERROR');
      setMessage("An error occurred. Please try again.");
    }
  };

  const handleScan = (code: string) => {
    setSessionCode(code);
    setShowScanner(false);
  };

  if (status === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in-up">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg animate-bounce-short">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-800 mb-2">You're Checked In!</h2>
        <p className="text-gray-600 text-center mb-8 text-lg">
          Welcome to class, <span className="font-bold text-indigo-600">{name}</span>. Your attendance has been recorded.
        </p>
        <button
          onClick={() => {
            setStatus('IDLE');
            setSessionCode('');
            setMessage('');
          }}
          className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors flex items-center gap-2 group"
        >
          Check in for another class <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto glass-card rounded-2xl shadow-xl overflow-hidden my-12 animate-fade-in-up">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <h2 className="text-3xl font-black text-white relative z-10">Student Check-In</h2>
        <p className="text-indigo-100 mt-2 relative z-10 font-medium">Scan QR or enter code manually</p>
      </div>

      <div className="p-8">
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowScanner(true)}
            className="flex flex-col items-center justify-center w-full h-32 bg-indigo-50/50 border-2 border-indigo-200 border-dashed rounded-2xl hover:bg-indigo-50 hover:border-indigo-400 transition-all group cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
              <QrCode className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm font-bold text-indigo-700">Tap to Scan QR Code</span>
          </button>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Or Enter Details</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide text-xs">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide text-xs">Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
              placeholder="e.g. 2023001"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide text-xs">Session Code</label>
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all uppercase tracking-widest font-mono text-lg text-center font-bold placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
              placeholder="XXXX-XXXX"
            />
          </div>

          {message && status === 'ERROR' && (
            <div className="flex items-center text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-100 animate-pulse">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="font-medium">{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'LOADING'}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md active:scale-[0.99]"
          >
            {status === 'LOADING' ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Mark Attendance</span>
                <Send size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      {showScanner && (
        <QrScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};
