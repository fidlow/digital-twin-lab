// src/types/lessons.ts
import type { Controls, ModeKey } from "../models/digitalTwin";

export type LessonAction =
  | { kind: "setMode"; mode: ModeKey }
  | { kind: "setControls"; controls: Controls }
  | { kind: "setPreview"; on: boolean }
  | { kind: "pause" }
  | { kind: "noop" };

export type LessonCondition =
  | { kind: "manual" }
  | { kind: "delay"; ms: number }
  | { kind: "riskAtLeast"; threshold: number }
  | { kind: "tempAtLeast"; threshold: number }
  | { kind: "tempAtMost"; threshold: number };

export interface LessonStep {
  text: string;
  action?: LessonAction;
  delayedAction?: { delayMs: number; action: LessonAction };
  onAdvance?: LessonAction;
  advanceOn: LessonCondition;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  steps: LessonStep[];
}

export interface QuizOption {
  label: string;
  action?: LessonAction;
  outcome?: string;
}

export interface Quiz {
  id: string;
  prompt: string;
  options: QuizOption[];
}
