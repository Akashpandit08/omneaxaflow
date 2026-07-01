import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuizQuestion } from "@/store/quizStore";

interface QuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (question: Omit<QuizQuestion, "id" | "quiz_id">) => void;
  initialData?: QuizQuestion;
}

export function QuestionModal({ open, onClose, onSave, initialData }: QuestionModalProps) {
  const [question, setQuestion] = useState(initialData?.question || "");
  const [options, setOptions] = useState<string[]>(initialData?.options || ["", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(initialData?.correct_answer || "");
  const [timestamp, setTimestamp] = useState(initialData?.timestamp_seconds || 0);

  const handleSave = () => {
    if (!question || options.some(o => !o) || !correctAnswer) return;
    onSave({
      question,
      options,
      correct_answer: correctAnswer,
      timestamp_seconds: timestamp,
      points: 1
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initialData ? "Edit Question" : "Add Question"}>
      <div className="space-y-4 py-4">
        <div>
          <label className="text-sm font-medium">Timestamp (seconds)</label>
          <Input type="number" value={timestamp} onChange={(e) => setTimestamp(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-sm font-medium">Question</label>
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter question..." />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Options</label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-2">
              <Input value={opt} onChange={(e) => {
                const newOpts = [...options];
                newOpts[idx] = e.target.value;
                setOptions(newOpts);
              }} placeholder={`Option ${idx + 1}`} />
              <Button variant="ghost" onClick={() => setCorrectAnswer(opt)} className={correctAnswer === opt ? "bg-green-100 text-green-700" : ""}>
                Set Correct
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>+ Add Option</Button>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </Modal>
  );
}
