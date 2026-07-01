import { create } from "zustand";

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question: string;
  options: string[];
  correct_answer: string;
  timestamp_seconds: number;
  points: number;
}

export interface Quiz {
  id: number;
  video_id: number;
  workspace_id: number;
  title: string;
  created_by: number | null;
  created_at: string;
  questions: QuizQuestion[];
}

interface QuizState {
  quizzes: Record<number, Quiz[]>; // video_id -> Quiz[]
  isLoading: boolean;
  setQuizzes: (videoId: number, quizzes: Quiz[]) => void;
  addQuiz: (videoId: number, quiz: Quiz) => void;
  updateQuiz: (videoId: number, quizId: number, updates: Partial<Quiz>) => void;
  removeQuiz: (videoId: number, quizId: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  quizzes: {},
  isLoading: false,
  setQuizzes: (videoId, quizzes) => set((state) => ({ 
    quizzes: { ...state.quizzes, [videoId]: quizzes } 
  })),
  addQuiz: (videoId, quiz) => set((state) => ({ 
    quizzes: { ...state.quizzes, [videoId]: [...(state.quizzes[videoId] || []), quiz] } 
  })),
  updateQuiz: (videoId, quizId, updates) => set((state) => {
    const videoQuizzes = state.quizzes[videoId] || [];
    return {
      quizzes: {
        ...state.quizzes,
        [videoId]: videoQuizzes.map(q => q.id === quizId ? { ...q, ...updates } : q)
      }
    };
  }),
  removeQuiz: (videoId, quizId) => set((state) => {
    const videoQuizzes = state.quizzes[videoId] || [];
    return {
      quizzes: {
        ...state.quizzes,
        [videoId]: videoQuizzes.filter(q => q.id !== quizId)
      }
    };
  }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
