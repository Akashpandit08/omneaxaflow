"use client";

import React, { useState, useEffect } from "react";
import { useQuizStore } from "@/store/quizStore";
import { QuizEditor } from "@/components/quiz/QuizEditor";
import { QuestionModal } from "@/components/quiz/QuestionModal";
import { Button } from "@/components/ui/Button";

export default function QuizzesPage() {
  const { quizzes, setQuizzes, addQuiz, removeQuiz, updateQuiz } = useQuizStore();
  const [videoId, setVideoId] = useState(1); // Hardcoded for demo/dashboard
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  
  const videoQuizzes = quizzes[videoId] || [];

  useEffect(() => {
    fetch(`/api/v1/videos/${videoId}/quizzes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => setQuizzes(videoId, data))
      .catch(console.error);
  }, [videoId, setQuizzes]);

  const handleCreateQuiz = async () => {
    try {
      const res = await fetch(`/api/v1/videos/${videoId}/quizzes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: "New Interactive Quiz",
          questions: []
        })
      });
      if (res.ok) {
        const data = await res.json();
        addQuiz(videoId, data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/quizzes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        removeQuiz(videoId, id);
      }
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
      const res = await fetch(`/api/v1/quizzes/${selectedQuizId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: quiz.title,
          questions: newQuestions
        })
      });
      if (res.ok) {
        const data = await res.json();
        updateQuiz(videoId, selectedQuizId, data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
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
        {videoQuizzes.map(quiz => (
          <QuizEditor 
            key={quiz.id} 
            quiz={quiz}
            onDelete={handleDelete}
            onEdit={(q) => {
              setSelectedQuizId(q.id);
              setIsQuestionModalOpen(true);
            }}
          />
        ))}
      </div>

      {videoQuizzes.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
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
