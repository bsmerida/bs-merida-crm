import Link from "next/link";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";

export default function NotFound() {
  return (
    <div className="bg-cream p-4 font-dmsans break-words min-h-screen">
      <PublicHeaderV3 active="" />
      <div className="pt-16 md:pt-24 px-5 md:px-16 flex flex-col items-center text-center gap-4 md:gap-5">
        <p className="font-medium text-stone-dk text-7xl md:text-[187px] tracking-tight md:tracking-[-5.61px]">404</p>
        <h1 className="font-serif text-navy text-3xl md:text-[80px] md:leading-[80px] -mt-6 md:-mt-10">
          Esta página <em className="italic not-italic font-serif text-gold">no existe.</em>
        </h1>
        <p className="text-[#6b7385] text-base md:text-[20px]">
          Puede que la propiedad ya se haya vendido o que el enlace haya cambiado.
        </p>
        <div className="flex gap-2.5 pt-3 flex-wrap justify-center">
          <Link href="/" className="bg-navy text-white font-semibold px-8 py-[17px] rounded-full hover:bg-navy-mid transition-colors">
            Volver al inicio
          </Link>
          <Link href="/comprar" className="border border-navy/30 text-navy font-semibold px-8 py-[17px] rounded-full hover:bg-navy/5 transition-colors">
            Ver propiedades
          </Link>
        </div>
      </div>
    </div>
  );
}
