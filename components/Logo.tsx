"use client";
import Link from "next/link";
import Image from "next/image";
// Archivo estático (antes 145 KB de base64 dentro del JS de cada página)
const DUCLAUD_LOGO_DARK = "/logo-dark.jpg";

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
