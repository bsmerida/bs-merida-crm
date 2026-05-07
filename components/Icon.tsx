type IconProps = { name: string; className?: string; strokeWidth?: number };

const paths: Record<string, JSX.Element> = {
  home: <path d="M3 12L12 4l9 8M5 10v10h14V10" />,
  users: (
    <>
      <circle cx={12} cy={8} r={3.5} />
      <path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  building: (
    <>
      <path d="M5 21V5l7-2 7 2v16M5 21h14" />
      <path d="M9 9h0M9 13h0M9 17h0M15 9h0M15 13h0M15 17h0" />
    </>
  ),
  flow: <path d="M4 6h6v4H4zM14 6h6v4h-6zM4 14h6v4H4zM14 14h6v4h-6zM10 8h4M10 16h4M7 10v4M17 10v4" />,
  spark: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" />,
  globe: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </>
  ),
  chat: <path d="M21 12a8 8 0 01-11.3 7.3L4 21l1.7-5.7A8 8 0 1121 12z" />,
  chart: <path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3" />,
  settings: (
    <>
      <circle cx={12} cy={12} r={3} />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx={11} cy={11} r={7} />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 004 0" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  arrowRight: <path d="M5 12h14M13 5l7 7-7 7" />,
  heart: <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.7 1-1a5.5 5.5 0 000-7.8z" />,
  bed: <path d="M3 18v-3a2 2 0 012-2h14a2 2 0 012 2v3M3 18h18M3 18v2M21 18v2M7 13V9a2 2 0 012-2h6a2 2 0 012 2v4" />,
  bath: <path d="M5 12h14v3a4 4 0 01-4 4H9a4 4 0 01-4-4v-3zM7 12V6a2 2 0 014 0M5 19l-1 2M19 19l1 2" />,
  car: (
    <>
      <path d="M3 13l1.5-5a2 2 0 012-1.5h11a2 2 0 012 1.5L21 13M5 18h14M3 13h18v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3z" />
      <circle cx={7.5} cy={15.5} r={1.5} />
      <circle cx={16.5} cy={15.5} r={1.5} />
    </>
  ),
  sqm: <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6zM9 6h6M9 18h6M6 9v6M18 9v6" />,
  pin: (
    <>
      <path d="M12 22s8-7 8-13a8 8 0 10-16 0c0 6 8 13 8 13z" />
      <circle cx={12} cy={9} r={3} />
    </>
  ),
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  logout: <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />,
  facebook: <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />,
  instagram: (
    <>
      <rect x={2} y={2} width={20} height={20} rx={5} />
      <path d="M16 11.4a4 4 0 11-8 0 4 4 0 018 0zM17.5 6.5h.01" />
    </>
  ),
  tiktok: <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5" />,
};

export function Icon({ name, className = "w-5 h-5", strokeWidth = 1.5 }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}
