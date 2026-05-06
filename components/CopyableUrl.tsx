"use client";
import { useState } from "react";
import { Icon } from "./Icon";

export function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="flex items-center gap-2 bg-white/15 rounded-xl p-1 pl-4">
      <code className="flex-1 text-sm text-white truncate">{url}</code>
      <button onClick={copy} className="bg-white text-brand-700 hover:bg-white/90 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
        {copied ? <><Icon name="check" className="w-4 h-4" /> Copiado</> : <>Copiar URL</>}
      </button>
    </div>
  );
}
