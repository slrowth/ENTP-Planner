
export type ItemType = 'schedule' | 'task' | 'idea';
export type ItemStatus = 'inbox' | 'today' | 'this_week' | 'soon' | 'someday' | 'done';
export type Priority = 'high' | 'medium' | 'low';

export interface AIAnalysis {
  priority?: Priority;
  estimatedMinutes?: number;
  tags?: string[];
  comment?: string;
  confidence: number;
}

export interface FlowItem {
  id: string;
  type: ItemType;
  title: string;
  content?: string;
  status: ItemStatus;
  aiAnalysis?: AIAnalysis;
  datetime?: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/* 
 * RealityCheck and AIResponse reflect the structure returned by the Gemini API.
 * Using snake_case to match the responseSchema in services/gemini.ts.
 */
export interface RealityCheck {
  is_overloaded: boolean;
  suggestion: string;
}

export interface AIResponse {
  items: Array<{
    type: string;
    title: string;
    content?: string;
    datetime?: string;
    priority?: string;
    estimated_minutes?: number;
    tags?: string[];
    ai_comment?: string;
  }>;
  reality_check: RealityCheck;
}
