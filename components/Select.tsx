"use client";
import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string; group?: string };

export function Select({
  value,
  onChange,
  options,
  className,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={className || "w-full bg-white border border-stone rounded-full px-4 py-2.5 text-sm text-left focus:outline-none disabled:opacity-50"}
      >
        {current?.label ?? placeholder ?? value}
      </button>
      {open && !disabled && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 min-w-max bg-white rounded-[20px] shadow-float p-1.5 max-h-72 overflow-y-auto">
          {options.map((o, i) => (
            <div key={o.value + i}>
              {o.group && o.group !== options[i - 1]?.group && (
                <div className="text-[10px] uppercase tracking-[0.1em] text-[#6b7385] px-3.5 pt-2.5 pb-1 first:pt-1">{o.group}</div>
              )}
              <button
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 rounded-[14px] text-sm transition whitespace-nowrap ${
                  o.value === value ? "bg-navy text-white" : "text-navy hover:bg-cream"
                }`}
              >
                {o.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
