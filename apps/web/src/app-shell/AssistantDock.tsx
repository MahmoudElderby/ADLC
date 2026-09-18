import { useEffect, useState, type ReactNode } from "react";
import { Button, I, SectionLabel, SvgIcon, type AssistantState } from "@adlc/ui";

const STORAGE_KEY = "adlc.assistant.state";

function readStoredState(): AssistantState {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "expanded" || value === "collapsed" || value === "hidden") {
      return value;
    }
  } catch {
    return "expanded";
  }
  return "expanded";
}

export function useAssistantState(): {
  state: AssistantState;
  setState: (state: AssistantState) => void;
} {
  const [state, setState] = useState<AssistantState>(() =>
    typeof window === "undefined" ? "expanded" : readStoredState(),
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, state);
    } catch {
      // Persistence is best-effort; a blocked store must not crash the shell.
    }
  }, [state]);

  return { state, setState };
}

export function AssistantDock({
  state,
  setState,
  contextLabel,
}: {
  state: AssistantState;
  setState: (state: AssistantState) => void;
  contextLabel: string;
}): ReactNode {
  if (state === "hidden") {
    return null;
  }

  if (state === "collapsed") {
    return (
      <div className="flex h-full flex-col items-center gap-3 py-2">
        <button
          type="button"
          aria-label="Expand assistant"
          onClick={() => setState("expanded")}
          className="flex h-8 w-8 items-center justify-center text-[#06B6D4] transition-colors hover:text-[#67E8F9]"
        >
          <SvgIcon d={I.chat} size={16} />
        </button>
        <button
          type="button"
          aria-label="Hide assistant"
          onClick={() => setState("hidden")}
          className="flex h-8 w-8 items-center justify-center text-[#4A5568] transition-colors hover:text-[#8892A4]"
        >
          <SvgIcon d={I.x} size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[#1E2129] px-3 py-2">
        <SectionLabel>Assistant</SectionLabel>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" onClick={() => setState("collapsed")}>
            Collapse assistant
          </Button>
          <Button type="button" variant="ghost" onClick={() => setState("hidden")}>
            Hide assistant
          </Button>
        </div>
      </div>
      <div className="border-b border-[#1E2129] px-3 py-1.5 font-mono text-[10px] text-[#3A4255]">
        {contextLabel}
      </div>
      <div className="flex-1 px-3 py-3 text-[13px] text-[#4A5568]">
        Operational region. Chat arrives in a later slice.
      </div>
    </div>
  );
}
