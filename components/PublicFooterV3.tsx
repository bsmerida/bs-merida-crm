import Link from "next/link";
import { NAV_V3 } from "./PublicHeaderV3";

export function PublicFooterV3() {
  return (
    <footer className="rounded-[32px] sm:rounded-[48px] bg-stone px-6 sm:px-10 md:px-16 pt-10 sm:pt-16 pb-8 sm:pb-10 flex flex-col gap-8 sm:gap-10 font-dmsans break-words">
      <div className="flex flex-col md:flex-row justify-between gap-10">
        <div>
          <p className="font-serif text-navy text-[32px] xl:text-[38px] tracking-[1.28px] xl:tracking-[1.52px] leading-none">D<span className="text-gold">.</span>UCLAUD</p>
          <p className="text-navy/80 text-[10px] xl:text-[11px] tracking-[3.2px] xl:tracking-[3.74px] uppercase mt-1">Bienes Raíces</p>
          <p className="font-serif italic text-[#6b7385] text-xl xl:text-[22px] mt-4">Inversiones que trascienden.</p>
        </div>
        <div className="flex gap-16 flex-wrap">
          <div className="flex flex-col gap-2.5">
            <p className="text-gold text-xs font-semibold tracking-[1.8px] xl:tracking-[2.16px] uppercase mb-1">Navegación</p>
            {NAV_V3.map(n => (
              <Link key={n.href} href={n.href} className="text-navy text-[15px] xl:text-[16px] hover:text-gold transition-colors">{n.l}</Link>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-gold text-xs font-semibold tracking-[1.8px] xl:tracking-[2.16px] uppercase mb-1">Contacto</p>
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272"}`} target="_blank" rel="noopener noreferrer" className="text-navy text-[15px] xl:text-[16px] hover:text-gold transition-colors">999 746 6272</a>
            <a href="mailto:contacto@duclaud.com.mx" className="text-navy text-[15px] xl:text-[16px] hover:text-gold transition-colors">contacto@duclaud.com.mx</a>
            <p className="text-navy text-[15px] xl:text-[16px]">Mérida, Yucatán</p>
          </div>
        </div>
      </div>
      <p className="text-[#6b7385] text-[13px]">© {new Date().getFullYear()} Duclaud Bienes Raíces · <Link href="/aviso-privacidad" className="hover:text-navy transition-colors">Aviso de privacidad</Link> · AMPI · PROFECO 5589-2022</p>
      <div className="flex gap-6 -mt-4">
        <Link href="/derechos-clientes" className="text-[#6b7385]/70 text-xs hover:text-navy transition-colors">Carta de derechos del consumidor</Link>
        <Link href="/login" className="text-[#6b7385]/70 text-xs hover:text-navy transition-colors">Acceso asesores</Link>
      </div>
    </footer>
  );
}
