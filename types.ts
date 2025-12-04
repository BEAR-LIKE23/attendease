export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  NONE = 'NONE'
}

export interface AttendanceRecord {
  id: string;
  studentName: string;
  studentId: string;
  sessionId: string;
  timestamp: string; // ISO string
}

export interface Course {
  id: string;
  name: string;
  code: string;
  enrollmentCode: string;
  description?: string;
  schedule?: string;
  createdAt: string;
  studentCount?: number;
}

export interface ClassSession {
  id: string;
  courseId?: string;
  className: string;
  topic: string;
  code: string; // The unique code generated for QR
  createdAt: string; // ISO string
  isActive: boolean;
}

export interface AnalysisResult {
  summary: string;
  attendanceRate: number;
  recommendations: string[];
}
