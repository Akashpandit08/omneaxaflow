import React from "react";
import { Quiz } from "@/store/quizStore";
import { Button } from "@/components/ui/Button";

interface QuizEditorProps {
  quiz: Quiz;
  onEdit: (quiz: Quiz) => void;
  onDelete: (id: number) => void;
}

export function QuizEditor({ quiz, onEdit, onDelete }: QuizEditorProps) {
  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{quiz.title}</h3>
          <p className="text-sm text-muted-foreground">{quiz.questions.length} Questions</p>
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(quiz)}>
          Manage Questions
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(quiz.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
