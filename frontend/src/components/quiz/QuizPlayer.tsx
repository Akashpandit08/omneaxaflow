import React, { useState, useEffect, useRef } from "react";
import { Quiz } from "@/store/quizStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface QuizPlayerProps {
  quiz: Quiz;
  videoUrl: string;
}

export function QuizPlayer({ quiz, videoUrl }: QuizPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const question = quiz.questions.find(
        (q) => Math.abs(q.timestamp_seconds - currentTime) < 1 && !answeredQuestions.has(q.id)
      );

      if (question && !currentQuestion) {
        video.pause();
        setCurrentQuestion(question);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [quiz, answeredQuestions, currentQuestion]);

  const handleAnswer = (answer: string) => {
    if (currentQuestion) {
      if (answer === currentQuestion.correct_answer) {
        setScore(s => s + currentQuestion.points);
      }
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestion.id));
      setCurrentQuestion(null);
      videoRef.current?.play();
    }
  };

  return (
    <div className="relative border rounded-lg overflow-hidden bg-black">
      <video ref={videoRef} controls src={videoUrl} className="w-full" />
      
      {currentQuestion && (
        <Modal 
          open={true} 
          onClose={() => {}} 
          hideClose
          title="Quiz Time!"
        >
          <div className="space-y-4 py-4">
            <p className="text-lg font-medium">{currentQuestion.question}</p>
            <div className="grid grid-cols-1 gap-2">
              {currentQuestion.options.map((opt: string, idx: number) => (
                <Button key={idx} variant="outline" onClick={() => handleAnswer(opt)}>
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        </Modal>
      )}
      
      <div className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
        Score: {score}
      </div>
    </div>
  );
}
