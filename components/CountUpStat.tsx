"use client";
import { useEffect, useRef, useState } from "react";

// Anima el número cuando entra en pantalla — "600+" o "100%" se parten en
// número + sufijo, se cuenta rápido de 0 al número y se le vuelve a pegar el sufijo.
export function CountUpStat({ value, duration = 1100 }: { value: string; duration?: number }) {
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? Number(match[1]) : null;
  const sufijo = match ? match[2] : "";
  const [n, setN] = useState(0);
  const [listo, setListo] = useState(target === null);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (target === null) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || listo) return;
      setListo(true);
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const avance = Math.min(1, (ahora - inicio) / duration);
        setN(Math.round(target * (1 - (1 - avance) ** 3))); // ease-out
        if (avance < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- target/duration no cambian en este uso
  }, []);

  return (
    <p ref={ref} className="font-dmsans font-medium text-navy text-6xl md:text-[92px] tracking-tight md:tracking-[-2.76px]">
      {target === null ? value : n}{sufijo}
    </p>
  );
}
