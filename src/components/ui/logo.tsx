export function SynvoraLogo({
  size = 32,
  showWordmark = true,
  dark = false,
}: {
  size?: number;
  showWordmark?: boolean;
  dark?: boolean;
}) {
  const fontSize = Math.round(size * 0.5);
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Synvora"
      >
        <rect width="40" height="40" rx="10" fill="#0A5AFF" />
        {/* Top-right arc flowing to mid-left */}
        <path
          d="M27 13C27 9.5 24 8 20 8C16 8 13 10 13 14C13 18 17 19.5 20 20C23 20.5 27 22 27 26C27 30 24 32 20 32C16 32 13 30.5 13 27"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span
          className={`font-semibold tracking-tight leading-none ${dark ? "text-white" : "text-slate-900"}`}
          style={{ fontSize }}
        >
          Synvora
        </span>
      )}
    </div>
  );
}
