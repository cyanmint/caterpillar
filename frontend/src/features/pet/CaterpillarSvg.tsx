import type { PetStats } from "../../db";

export const moodConfig: Record<
  PetStats["mood"],
  { bodyColor: string; label: string; emoji: string; animDuration: string | null }
> = {
  happy:   { bodyColor: "#4ade80", label: "Feeling happy!",  emoji: "🎉", animDuration: "0.5s" },
  neutral: { bodyColor: "#a3e635", label: "Feeling okay",    emoji: "😐", animDuration: "1.2s" },
  sad:     { bodyColor: "#facc15", label: "Feeling sad",     emoji: "😔", animDuration: "2.5s" },
  sick:    { bodyColor: "#9ca3af", label: "Not well",        emoji: "😷", animDuration: null },
};

export function CaterpillarSvg({
  mood,
  className,
}: {
  mood: PetStats["mood"];
  className?: string;
}) {
  const { bodyColor } = moodConfig[mood];
  const happy = mood === "happy";
  const sad = mood === "sad";
  const sick = mood === "sick";

  const segments = [
    { cx: 52,  r: 22 },
    { cx: 92,  r: 19 },
    { cx: 128, r: 17 },
    { cx: 161, r: 15 },
    { cx: 190, r: 13 },
    { cx: 215, r: 11 },
  ];
  const cy = 72;

  return (
    <svg
      viewBox="0 0 260 110"
      className={className ?? "w-full max-w-xs mx-auto"}
      role="img"
      aria-label={`Caterpillar feeling ${mood}`}
    >
      {/* Antennae */}
      <line x1="38" y1="50" x2="22" y2="25" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="52" y1="47" x2="50" y2="20" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="22" cy="23" r="3.5" fill="#f97316" />
      <circle cx="50" cy="18" r="3.5" fill="#f97316" />

      {/* Body segments (tail → head so head is on top) */}
      {[...segments].reverse().map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={cy}
          r={s.r}
          fill={bodyColor}
          stroke="#15803d"
          strokeWidth="1.5"
          opacity={0.95}
        />
      ))}

      {/* Eyes */}
      {sick ? (
        <>
          <line x1="43" y1="64" x2="49" y2="70" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="49" y1="64" x2="43" y2="70" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="57" y1="64" x2="63" y2="70" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="63" y1="64" x2="57" y2="70" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="45" cy="67" r="4" fill="#1e293b" />
          <circle cx="60" cy="67" r="4" fill="#1e293b" />
          <circle cx="47" cy="65" r="1.5" fill="white" />
          <circle cx="62" cy="65" r="1.5" fill="white" />
        </>
      )}

      {/* Mouth */}
      {happy && (
        <path d="M 44 76 Q 52 84 60 76" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {mood === "neutral" && (
        <line x1="44" y1="79" x2="60" y2="79" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {(sad || sick) && (
        <path d="M 44 82 Q 52 75 60 82" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      )}

      {/* Legs */}
      {segments.slice(1).map((s, i) => (
        <g key={i}>
          <line
            x1={s.cx - 4} y1={cy + s.r - 2}
            x2={s.cx - 10} y2={cy + s.r + 10}
            stroke="#4b5563" strokeWidth="2" strokeLinecap="round"
          />
          <line
            x1={s.cx + 4} y1={cy + s.r - 2}
            x2={s.cx + 10} y2={cy + s.r + 10}
            stroke="#4b5563" strokeWidth="2" strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}
