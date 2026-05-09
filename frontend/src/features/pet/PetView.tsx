import { useState } from "react";
import { usePetStore } from "../../stores/usePetStore";
import type { PetStats } from "../../db";

const moodConfig: Record<
  PetStats["mood"],
  { bodyColor: string; label: string; emoji: string; animDuration: string | null }
> = {
  happy:   { bodyColor: "#4ade80", label: "Feeling happy!",  emoji: "🎉", animDuration: "0.5s" },
  neutral: { bodyColor: "#a3e635", label: "Feeling okay",    emoji: "😐", animDuration: "1.2s" },
  sad:     { bodyColor: "#facc15", label: "Feeling sad",     emoji: "😔", animDuration: "2.5s" },
  sick:    { bodyColor: "#9ca3af", label: "Not well",        emoji: "😷", animDuration: null },
};

function CaterpillarSvg({ mood }: { mood: PetStats["mood"] }) {
  const { bodyColor } = moodConfig[mood];
  const happy = mood === "happy";
  const sad = mood === "sad";
  const sick = mood === "sick";

  // Body: 6 circles forming caterpillar, decreasing size head→tail
  const segments = [
    { cx: 52,  r: 22 }, // head (largest)
    { cx: 92,  r: 19 },
    { cx: 128, r: 17 },
    { cx: 161, r: 15 },
    { cx: 190, r: 13 },
    { cx: 215, r: 11 }, // tail
  ];
  const cy = 72;

  return (
    <svg viewBox="0 0 260 110" className="w-full max-w-xs mx-auto" role="img" aria-label={`Caterpillar feeling ${mood}`}>
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
          {/* X eyes when sick */}
          <line x1="43" y1="64" x2="49" y2="70" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="49" y1="64" x2="43" y2="70" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="57" y1="64" x2="63" y2="70" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="63" y1="64" x2="57" y2="70" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="45" cy="67" r="4" fill="#1e293b" />
          <circle cx="60" cy="67" r="4" fill="#1e293b" />
          {/* Shine */}
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

function StatBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-200">
        <div
          className={`h-3 rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function PetView() {
  const stats = usePetStore((s) => s.stats);
  const updatePetName = usePetStore((s) => s.updatePetName);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(stats.petName);

  const cfg = moodConfig[stats.mood];

  async function saveName() {
    const trimmed = nameInput.trim();
    if (trimmed) await updatePetName(trimmed);
    setEditing(false);
  }

  const animStyle: React.CSSProperties =
    cfg.animDuration === null
      ? {}
      : {
          animation: `wiggle ${cfg.animDuration} ease-in-out infinite alternate`,
        };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <style>{`
        @keyframes wiggle {
          from { transform: translateX(-6px); }
          to   { transform: translateX(6px); }
        }
      `}</style>

      {/* Pet name */}
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              className="rounded-md border border-slate-300 px-2 py-1 text-lg font-bold"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              autoFocus
            />
            <button
              type="button"
              onClick={saveName}
              className="rounded-md bg-slate-800 px-3 py-1 text-sm text-white"
            >
              Save
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-800">{stats.petName}</h2>
            <button
              type="button"
              onClick={() => { setNameInput(stats.petName); setEditing(true); }}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Edit pet name"
            >
              ✏️
            </button>
          </>
        )}
      </div>

      {/* Caterpillar SVG with animation */}
      <div className="w-full max-w-xs" style={animStyle}>
        <CaterpillarSvg mood={stats.mood} />
      </div>

      {/* Mood label */}
      <div className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow border border-slate-200">
        {cfg.label} {cfg.emoji}
      </div>

      {/* Stats */}
      <div className="w-full max-w-xs rounded-xl bg-white p-4 shadow-sm border border-slate-200 space-y-3">
        <StatBar value={stats.energy} color="bg-green-500" label="Energy" />
        <StatBar value={stats.hunger} color="bg-orange-400" label="Hunger" />
      </div>

      {/* Streak */}
      <div className="w-full max-w-xs rounded-xl bg-white p-4 shadow-sm border border-slate-200 text-center">
        <p className="text-3xl font-bold text-slate-800">{stats.consistencyStreak}</p>
        <p className="text-sm text-slate-500">day streak</p>
        {stats.consistencyStreak > 0 ? (
          <p className="mt-1 text-sm font-medium text-green-600">
            🔥 {stats.consistencyStreak} day{stats.consistencyStreak !== 1 ? "s" : ""}! Keep it up!
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">No streak yet — take your meds!</p>
        )}
        {stats.bestStreak > 0 && (
          <p className="mt-1 text-xs text-slate-400">Best: {stats.bestStreak} days</p>
        )}
      </div>
    </div>
  );
}
