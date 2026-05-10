// src/components/ExplanationDrawer.tsx
import { Tex } from "./Tex";
import { EXPLANATIONS } from "../docs/explanations";

interface ExplanationDrawerProps {
  openKey: string | null;
  onClose: () => void;
}

export function ExplanationDrawer({ openKey, onClose }: ExplanationDrawerProps) {
  if (!openKey) return null;
  const exp = EXPLANATIONS[openKey];
  if (!exp) return null;
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-auto bg-white p-6 shadow-2xl"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">{exp.title}</h2>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200" aria-label="Закрыть">×</button>
        </div>
        {exp.formula && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <Tex display wrap>{exp.formula}</Tex>
          </div>
        )}
        <p className="mt-4 text-sm leading-6 text-slate-700">{exp.body}</p>
        {exp.constants && exp.constants.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm">
            {exp.constants.map((c) => (
              <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="font-mono text-slate-700">
                  {c.value}{c.unit ? ` ${c.unit}` : ""}
                </span>
                {c.note && <span className="basis-full text-xs text-slate-500">{c.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
