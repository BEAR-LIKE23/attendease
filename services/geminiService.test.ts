import { generateAttendanceReport } from './geminiService';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock GoogleGenAI
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: class {
            models = {
                generateContent: mockGenerateContent
            };
        },
        Type: {
            OBJECT: 'OBJECT',
            STRING: 'STRING',
            ARRAY: 'ARRAY'
        }
    };
});

describe('geminiService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, API_KEY: 'test-key' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns error if API key is missing', async () => {
        delete process.env.API_KEY;
        const result = await generateAttendanceReport({} as any, [], 10);
        expect(result.summary).toContain('AI service unavailable');
    });

    it('generates report successfully', async () => {
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({
                summary: 'Good turnout',
                insights: ['Insight 1', 'Insight 2']
            })
        });

        const session = { className: 'Test Class', topic: 'Test Topic', createdAt: '2023-01-01' } as any;
        const records = [{ studentName: 'Student 1', timestamp: '2023-01-01' }] as any;

        const result = await generateAttendanceReport(session, records, 10);

        expect(result.summary).toBe('Good turnout');
        expect(result.insights).toHaveLength(2);
    });

    it('handles API errors gracefully', async () => {
        mockGenerateContent.mockRejectedValue(new Error('API Error'));

        const result = await generateAttendanceReport({} as any, [], 10);

        expect(result.summary).toBe('Failed to generate report.');
    });
});
