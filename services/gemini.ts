
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { AIResponse } from "../types";

// Gemini AI 인스턴스를 지연 초기화 (lazy initialization)
let aiInstance: GoogleGenAI | null = null;

// API 호출 시에만 인스턴스 생성
const getAIInstance = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API 키가 설정되지 않았습니다. 환경 변수 VITE_GEMINI_API_KEY를 확인해주세요.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const analyzeBrainDump = async (userInput: string): Promise<AIResponse> => {
  const ai = getAIInstance();
  
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
