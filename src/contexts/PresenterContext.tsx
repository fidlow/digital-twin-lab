import { createContext, useContext, type ReactNode } from "react";

const PresenterContext = createContext<boolean>(false);

export function PresenterProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <PresenterContext.Provider value={value}>{children}</PresenterContext.Provider>;
}

export function usePresenter(): boolean {
  return useContext(PresenterContext);
}
