"use client";

export function SofiaTeaser({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => window.dispatchEvent(new CustomEvent("sofia:open", { detail: null }))}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") window.dispatchEvent(new CustomEvent("sofia:open", { detail: null })); }}
      className="cursor-pointer"
    >
      {children}
    </div>
  );
}
