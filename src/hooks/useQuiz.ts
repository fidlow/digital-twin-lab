// src/hooks/useQuiz.ts
import { useCallback, useState } from "react";
import type { LessonHostApi } from "./useLessonRunner";
import type { Quiz, QuizOption } from "../types/lessons";

export interface UseQuizResult {
  active: Quiz | null;
  outcome: string | null;
  start: (quiz: Quiz) => void;
  choose: (option: QuizOption) => void;
  dismiss: () => void;
}

export interface UseQuizOptions {
  host: LessonHostApi;
  pause: () => void;
  resume: () => void;
}

export function useQuiz({ host, pause, resume }: UseQuizOptions): UseQuizResult {
  const [active, setActive] = useState<Quiz | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const start = useCallback((quiz: Quiz) => {
    pause();
    setOutcome(null);
    setActive(quiz);
  }, [pause]);

  const choose = useCallback((option: QuizOption) => {
    const a = option.action;
    if (a) {
      if (a.kind === "setMode") host.setMode(a.mode);
      else if (a.kind === "setControls") host.setControls(a.controls);
      else if (a.kind === "setPreview") host.setPreview(a.on);
    }
    setOutcome(option.outcome ?? null);
    resume();
  }, [host, resume]);

  const dismiss = useCallback(() => {
    setActive(null);
    setOutcome(null);
  }, []);

  return { active, outcome, start, choose, dismiss };
}
