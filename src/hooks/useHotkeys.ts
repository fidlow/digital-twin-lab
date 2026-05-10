import { useEffect, useRef } from "react";

export type HotkeyHandlers = Partial<Record<string, () => void>>;

// Привязывает обработчики к key события keydown. Игнорирует нажатия в полях ввода,
// чтобы пользователь мог напечатать «1» в input и оно не переключило сценарий.
// handlers хранится в ref, чтобы listener регистрировался один раз, даже если
// caller передаёт литеральный объект на каждый рендер.
export function useHotkeys(handlers: HotkeyHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const key = e.key === " " ? "Space" : e.key.toLowerCase();
      const handler = ref.current[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
