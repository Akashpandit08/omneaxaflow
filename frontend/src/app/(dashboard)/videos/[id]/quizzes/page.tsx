"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuizStore } from "@/store/quizStore";
import { QuizEditor } from "@/components/quiz/QuizEditor";
import { QuestionModal } from "@/components/quiz/QuestionModal";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";

export default function QuizzesPage() {
  const params = useParams();
  const videoId = parseInt(params.id as string, 10);
  const { quizzes, setQuizzes, addQuiz, removeQuiz, updateQuiz } = useQuizStore();
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  
  const videoQuizzes = quizzes[videoId] || [];

  useEffect(() => {
    if (!videoId) return;
    
    api.get(`/videos/${videoId}/quizzes`)
      .then(res => setQuizzes(videoId, res.data))
      .catch(console.error);
  }, [videoId, setQuizzes]);

  const handleCreateQuiz = async () => {
    try {
      const res = await api.post(`/videos/${videoId}/quizzes`, {
        title: "New Interactive Quiz",
        questions: []
      });
      addQuiz(videoId, res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/quizzes/${id}`);
      removeQuiz(videoId, id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveQuestion = async (questionData: any) => {
    if (!selectedQuizId) return;
    const quiz = videoQuizzes.find(q => q.id === selectedQuizId);
    if (!quiz) return;

    const newQuestions = [...quiz.questions, questionData];
    
    try {
      const res = await api.put(`/quizzes/${selectedQuizId}`, {
        title: quiz.title,
        questions: newQuestions
      });
      updateQuiz(videoId, selectedQuizId, res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Interactive Quizzes</h1>
          <p className="text-muted-foreground mt-2">
            Add timestamps to your videos to pause playback and present users with interactive questions.
          </p>
        </div>
        <Button onClick={handleCreateQuiz}>+ New Quiz</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videoQuizzes.map((quiz: any) => (
          <QuizEditor 
            key={quiz.id} 
            quiz={quiz}
            onDelete={handleDelete}
            onEdit={(q: any) => {
              setSelectedQuizId(q.id);
              setIsQuestionModalOpen(true);
            }}
          />
        ))}
      </div>

      {videoQuizzes.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-surface-border rounded-lg text-slate-400">
          No quizzes found for this video. Create one to get started.
        </div>
      )}

      {isQuestionModalOpen && (
        <QuestionModal
          open={isQuestionModalOpen}
          onClose={() => {
            setIsQuestionModalOpen(false);
            setSelectedQuizId(null);
          }}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  );
}
