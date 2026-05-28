"use client";
import Link from "next/link";
import Image from "next/image";
import { DUCLAUD_LOGO_DARK } from "@/lib/duclaud-logo";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`select-none inline-block ${className}`}>
      <Image
        src={DUCLAUD_LOGO_DARK}
        alt="D.UCLAUD Bienes Raíces"
        width={280}
        height={76}
        className="h-16 w-auto"
        priority
      />
    </Link>
  );
}
