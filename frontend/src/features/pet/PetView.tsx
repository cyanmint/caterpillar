import { useState } from "react";
import { usePetStore } from "../../stores/usePetStore";
import { CaterpillarSvg, moodConfig } from "./CaterpillarSvg";

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
