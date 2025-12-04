import { GoogleGenAI, Type } from "@google/genai";
import { AttendanceRecord, ClassSession } from "../types";

const createClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing from environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateAttendanceReport = async (
  session: ClassSession,
  records: AttendanceRecord[],
  totalStudents: number
): Promise<{ summary: string; insights: string[] }> => {
  const ai = createClient();
  if (!ai) {
    return {
      summary: "AI service unavailable (Missing API Key).",
      insights: ["Please configure your API key to see insights."]
    };
  }

  const prompt = `
    Analyze the attendance for the following class session:
    Class: ${session.className}
    Topic: ${session.topic}
    Date: ${session.createdAt}
    Total Enrolled Students: ${totalStudents}
    
    Attendance Records:
    ${JSON.stringify(records.map(r => ({ name: r.studentName, time: r.timestamp })))}

    Please provide:
    1. A brief summary of the turnout (percentage, timeliness).
    2. Three key insights or observations (e.g., if students joined late, or if attendance is low).
    
    Output JSON format with 'summary' (string) and 'insights' (array of strings).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      summary: "Failed to generate report.",
      insights: ["Error connecting to AI service."]
    };
  }
};
