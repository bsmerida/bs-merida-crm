"use client";
import { useState } from "react";

type Opcion = { label: string; time: string };

export function ElegirHorarioForm({ token, opciones, defaultIdx }: { token: string; opciones: Opcion[]; defaultIdx: number }) {
  const [selected, setSelected] = useState(defaultIdx);

  return (
    <>
      <div className="flex flex-col md:flex-row gap-3.5 mt-8 md:mt-10 w-full">
        {opciones.map((o, i) => {
          const active = i === selected;
          return (
            <button key={i} type="button" onClick={() => setSelected(i)}
              className={`flex-1 text-left rounded-[28px] md:rounded-[36px] px-7 md:px-[34px] py-6 md:py-[30px] transition-colors ${active ? "bg-navy" : "bg-stone hover:bg-stone-dk"}`}>
              <p className={`text-[11px] font-semibold tracking-[1.76px] uppercase ${active ? "text-gold" : "text-[#6b7385]"}`}>Opción {i + 1}</p>
              <p className={`font-serif text-4xl md:text-[64px] md:leading-[64px] md:tracking-[-0.64px] mt-1 ${active ? "text-white" : "text-navy"}`}>{o.time} h</p>
              <p className={`text-base md:text-[17px] mt-1 ${active ? "text-[#c9cfdb]" : "text-navy"}`}>{o.label}</p>
            </button>
          );
        })}
      </div>
      <form method="post" action="/api/citas/confirmar-cliente" className="mt-7 md:mt-8 flex flex-col gap-4 items-start">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="option" value={String(selected)} />
        <button type="submit" className="bg-navy hover:bg-navy-mid text-white font-semibold px-[30px] py-[17px] rounded-full transition-colors">
          Confirmar este horario
        </button>
        <p className="text-[#6b7385] text-base">¿Prefieres otro horario? Responde el correo o llama a tu asesor.</p>
      </form>
    </>
  );
}
