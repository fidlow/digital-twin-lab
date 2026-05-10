// src/hooks/useLessonRunner.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lesson, LessonAction, LessonCondition } from "../types/lessons";
import type { Controls, ModeKey } from "../models/digitalTwin";

export interface LessonHostApi {
  setMode: (mode: ModeKey) => void;
  setControls: (next: Controls) => void;
  setPreview: (on: boolean) => void;
  getRisk: () => number;
  getTemperature: () => number;
}

export interface UseLessonRunnerResult {
  activeLesson: Lesson | null;
  stepIndex: number;
  totalSteps: number;
  start: (lesson: Lesson) => void;
  next: () => void;
  stop: () => void;
}

export function useLessonRunner(host: LessonHostApi): UseLessonRunnerResult {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);

  const hostRef = useRef<LessonHostApi>(host);
  hostRef.current = host;

  const totalSteps = activeLesson?.steps.length ?? 0;

  const applyAction = useCallback((action?: LessonAction) => {
    if (!action) return;
    const h = hostRef.current;
    if (action.kind === "setMode") h.setMode(action.mode);
    else if (action.kind === "setControls") h.setControls(action.controls);
    else if (action.kind === "setPreview") h.setPreview(action.on);
  }, []);

  useEffect(() => {
    if (!activeLesson) return;
    const step = activeLesson.steps[stepIndex];
    if (!step) return;
    applyAction(step.action);
  }, [activeLesson, stepIndex, applyAction]);

  useEffect(() => {
    if (!activeLesson) return undefined;
    const step = activeLesson.steps[stepIndex];
    if (!step) return undefined;
    const cond: LessonCondition = step.advanceOn;
    if (cond.kind === "manual") return undefined;
    const enteredAt = Date.now();
    const id = setInterval(() => {
      let advance = false;
      if (cond.kind === "delay") advance = Date.now() - enteredAt >= cond.ms;
      else if (cond.kind === "riskAtLeast") advance = hostRef.current.getRisk() >= cond.threshold;
      else if (cond.kind === "tempAtLeast") advance = hostRef.current.getTemperature() >= cond.threshold;
      if (advance) setStepIndex((i) => Math.min(i + 1, activeLesson.steps.length));
    }, 250);
    return () => clearInterval(id);
  }, [activeLesson, stepIndex]);

  const start = useCallback((lesson: Lesson) => {
    setActiveLesson(lesson);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    if (!activeLesson) return;
    setStepIndex((i) => Math.min(i + 1, activeLesson.steps.length));
  }, [activeLesson]);

  const stop = useCallback(() => {
    setActiveLesson(null);
    setStepIndex(0);
  }, []);

  return { activeLesson, stepIndex, totalSteps, start, next, stop };
}
