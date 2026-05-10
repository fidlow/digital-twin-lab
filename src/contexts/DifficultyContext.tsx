// src/contexts/DifficultyContext.tsx
import { createContext, useContext, type ReactNode } from "react";

export type Difficulty = "basic" | "advanced";

const DifficultyContext = createContext<Difficulty>("basic");

export function DifficultyProvider({ value, children }: { value: Difficulty; children: ReactNode }) {
  return <DifficultyContext.Provider value={value}>{children}</DifficultyContext.Provider>;
}

export function useDifficulty(): Difficulty {
  return useContext(DifficultyContext);
}
