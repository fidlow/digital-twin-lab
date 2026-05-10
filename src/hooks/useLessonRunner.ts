// src/hooks/useLessonRunner.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lesson, LessonAction, LessonCondition } from "../types/lessons";
import type { Controls, ModeKey } from "../models/digitalTwin";

export interface LessonHostApi {
  setMode: (mode: ModeKey) => void;
  setControls: (next: Controls) => void;
  setPreview: (on: boolean) => void;
  pause: () => void;
  resume: () => void;
  getRisk: () => number;
  getTemperature: () => number;
}

export interface UseLessonRunnerResult {
  activeLesson: Lesson | null;
  stepIndex: number;
  totalSteps: number;
  awaitingNext: boolean;
  start: (lesson: Lesson) => void;
  next: () => void;
  stop: () => void;
}

export function useLessonRunner(host: LessonHostApi): UseLessonRunnerResult {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [awaitingNext, setAwaitingNext] = useState<boolean>(false);

  const hostRef = useRef<LessonHostApi>(host);
  hostRef.current = host;

  const totalSteps = activeLesson?.steps.length ?? 0;

  const applyAction = useCallback((action?: LessonAction) => {
    if (!action) return;
    const h = hostRef.current;
    if (action.kind === "setMode") h.setMode(action.mode);
    else if (action.kind === "setControls") h.setControls(action.controls);
    else if (action.kind === "setPreview") h.setPreview(action.on);
    else if (action.kind === "pause") h.pause();
  }, []);

  useEffect(() => {
    if (!activeLesson) return undefined;
    const step = activeLesson.steps[stepIndex];
    if (!step) return undefined;
    applyAction(step.action);
    setAwaitingNext(false);
    if (!step.delayedAction) return undefined;
    const { delayMs, action } = step.delayedAction;
    const id = setTimeout(() => applyAction(action), delayMs);
    return () => clearTimeout(id);
  }, [activeLesson, stepIndex, applyAction]);

  useEffect(() => {
    if (!activeLesson) return undefined;
    const step = activeLesson.steps[stepIndex];
    if (!step) return undefined;
    const cond: LessonCondition = step.advanceOn;
    if (cond.kind === "manual") return undefined;
    const enteredAt = Date.now();
    const id = setInterval(() => {
      let ready = false;
      if (cond.kind === "delay") ready = Date.now() - enteredAt >= cond.ms;
      else if (cond.kind === "riskAtLeast") ready = hostRef.current.getRisk() >= cond.threshold;
      else if (cond.kind === "tempAtLeast") ready = hostRef.current.getTemperature() >= cond.threshold;
      else if (cond.kind === "tempAtMost") ready = hostRef.current.getTemperature() <= cond.threshold;
      if (ready) {
        applyAction(step.onAdvance);
        setAwaitingNext(true);
        hostRef.current.pause();
        clearInterval(id);
      }
    }, 250);
    return () => clearInterval(id);
  }, [activeLesson, stepIndex]);

  const start = useCallback((lesson: Lesson) => {
    setActiveLesson(lesson);
    setStepIndex(0);
    setAwaitingNext(false);
  }, []);

  const next = useCallback(() => {
    if (!activeLesson) return;
    const step = activeLesson.steps[stepIndex];
    if (step?.advanceOn.kind === "manual") applyAction(step.onAdvance);
    setStepIndex((i) => Math.min(i + 1, activeLesson.steps.length));
    hostRef.current.resume();
  }, [activeLesson, stepIndex, applyAction]);

  const stop = useCallback(() => {
    setActiveLesson(null);
    setStepIndex(0);
    setAwaitingNext(false);
    hostRef.current.resume();
  }, []);

  return { activeLesson, stepIndex, totalSteps, awaitingNext, start, next, stop };
}
