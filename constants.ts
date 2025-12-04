import { ClassSession } from './types';

export const APP_NAME = "AttendEase";

export const MOCK_SESSIONS: ClassSession[] = [
  {
    id: 'sess-001',
    className: 'CS101: Intro to Computer Science',
    topic: 'Algorithms & Data Structures',
    code: 'CS101-ALG-2023',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isActive: false,
  },
  {
    id: 'sess-002',
    className: 'ENG202: Advanced Composition',
    topic: 'Modernist Literature',
    code: 'ENG202-MOD-2023',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    isActive: false,
  }
];
