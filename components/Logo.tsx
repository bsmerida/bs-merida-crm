"use client";
import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`select-none inline-block ${className}`}>
      <span className="font-serif text-[22px] font-light tracking-[0.16em] uppercase">
        D<span className="text-gold mx-0.5">·</span>UCLAUD
      </span>
    </Link>
  );
}
