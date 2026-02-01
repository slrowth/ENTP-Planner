
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { AIResponse } from "../types";

// Vite 환경변수 사용 (VITE_ 접두사 필요)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const analyzeBrainDump = async (userInput: string): Promise<AIResponse> => {
  // Use ai.models.generateContent to query GenAI with both the model name and prompt.
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `사용자 입력: "${userInput}"\n현재 날짜/시간: ${new Date().toLocaleString('ko-KR')}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['schedule', 'task', 'idea'] },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                datetime: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                estimated_minutes: { type: Type.NUMBER },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                ai_comment: { type: Type.STRING }
              },
              required: ['type', 'title']
            }
          },
          reality_check: {
            type: Type.OBJECT,
            properties: {
              is_overloaded: { type: Type.BOOLEAN },
              suggestion: { type: Type.STRING }
            },
            required: ['is_overloaded', 'suggestion']
          }
        },
        required: ['items', 'reality_check']
      }
    }
  });

  // Directly access the .text property from GenerateContentResponse.
  const text = response.text || "{}";
  return JSON.parse(text) as AIResponse;
};
