interface PendoMascotProps {
  className?: string;
}

/**
 * Hand-drawn flat illustration of Pendo: a white curly doodle with tan
 * ears, a black nose, and his dark collar with a red tag.
 * Static SVG — no motion, so `prefers-reduced-motion` needs no handling.
 */
export default function PendoMascot({ className = '' }: PendoMascotProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="Illustrated portrait of Pendo the doodle"
      className={className}
    >
      <title>Pendo the doodle</title>
      {/* ears */}
      <ellipse cx="38" cy="105" rx="22" ry="42" fill="#e3cfa3" />
      <ellipse cx="162" cy="105" rx="22" ry="42" fill="#e3cfa3" />
      <ellipse cx="38" cy="105" rx="11" ry="28" fill="#d4b983" />
      <ellipse cx="162" cy="105" rx="11" ry="28" fill="#d4b983" />
      {/* curly head: clustered puffs */}
      <g fill="#fbf5e8" stroke="#e2d5b8" strokeWidth="2">
        <circle cx="70" cy="62" r="26" />
        <circle cx="100" cy="50" r="30" />
        <circle cx="130" cy="62" r="26" />
        <circle cx="52" cy="95" r="24" />
        <circle cx="148" cy="95" r="24" />
        <circle cx="58" cy="128" r="24" />
        <circle cx="142" cy="128" r="24" />
        <circle cx="100" cy="100" r="52" stroke="none" />
      </g>
      {/* muzzle */}
      <ellipse cx="100" cy="128" rx="34" ry="26" fill="#fffdf6" stroke="#e2d5b8" strokeWidth="2" />
      {/* eyes */}
      <circle cx="80" cy="98" r="8" fill="#2b2320" />
      <circle cx="120" cy="98" r="8" fill="#2b2320" />
      <circle cx="82.5" cy="95.5" r="2.5" fill="#fbf5e8" />
      <circle cx="122.5" cy="95.5" r="2.5" fill="#fbf5e8" />
      {/* nose + mouth */}
      <ellipse cx="100" cy="122" rx="12" ry="9" fill="#211c19" />
      <path
        d="M100 131 Q100 140 91 142 M100 131 Q100 140 109 142"
        stroke="#211c19"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* tongue */}
      <rect x="93" y="142" width="14" height="18" rx="7" fill="#f2909e" />
      <line x1="100" y1="146" x2="100" y2="157" stroke="#d96f7e" strokeWidth="1.5" />
      {/* collar + tag */}
      <path d="M62 156 Q100 176 138 156 L134 170 Q100 188 66 170 Z" fill="#3a2e28" />
      <circle cx="100" cy="184" r="7" fill="#3a2e28" />
      <path d="M100 178 c-4-3-10 1-7 6 l7 8 7-8 c3-5-3-9-7-6z" fill="#dc322f" />
    </svg>
  );
}
