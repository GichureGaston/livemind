export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  aiExplanation?: string;
}

export interface QuizSession {
  id: string;
  topic: string;
  hostId: string;
  status: 'lobby' | 'active' | 'ended';
  currentQuestionIndex: number;
  questions: Question[];
  createdAt: number;
}

export interface Participant {
  id: string;
  nickname: string;
  score: number;
  answers: Record<string, number>;
  joinedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  rank?: number;
}
