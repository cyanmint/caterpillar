import { create } from "zustand";
import { db, type PetStats, type DoseLog, type Medication } from "../db";

const DEFAULT_STATS: PetStats = {
  userId: "local",
  petName: "Caterpillar",
  mood: "neutral",
  energy: 50,
  hunger: 50,
  consistencyStreak: 0,
  bestStreak: 0,
  updatedAt: new Date().toISOString(),
};

interface PetState {
  stats: PetStats;
  reactionEmoji: string | null;
  /** Number of body segments (not counting the head); grows when pills are taken */
  segments: number;
  loadPet: () => Promise<void>;
  recalculate: (allLogs: DoseLog[], medications: Medication[]) => Promise<void>;
  updatePetName: (name: string) => Promise<void>;
  triggerReaction: (emoji: string) => void;
  addSegment: () => void;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const usePetStore = create<PetState>((set, get) => ({
  stats: DEFAULT_STATS,
  reactionEmoji: null,
  segments: 3,

  addSegment() {
    const current = get().segments;
    if (current < 20) set({ segments: current + 1 });
  },

  triggerReaction(emoji) {
    set({ reactionEmoji: emoji });
    setTimeout(() => {
      // Only clear if the same emoji is still showing
      if (get().reactionEmoji === emoji) {
        set({ reactionEmoji: null });
      }
    }, 2000);
  },

  async loadPet() {
    const existing = await db.pet_stats.get("local");
    if (existing) {
      set({ stats: existing });
    } else {
      await db.pet_stats.put(DEFAULT_STATS);
      set({ stats: DEFAULT_STATS });
    }
  },

  async recalculate(allLogs, medications) {
    const now = new Date();
    const sevenDaysAgo = addDays(now, -7);
    const sevenDayPrefix = dateStr(sevenDaysAgo);

    // Filter logs from last 7 days (taken or missed only — skipped don't count)
    const recentLogs = allLogs.filter(
      (l) =>
        l.scheduledFor.slice(0, 10) >= sevenDayPrefix &&
        (l.status === "taken" || l.status === "missed"),
    );

    const takenCount = recentLogs.filter((l) => l.status === "taken").length;
    const totalCount = recentLogs.length;

    const adherenceRate = totalCount > 0 ? takenCount / totalCount : 0;

    let mood: PetStats["mood"];
    if (adherenceRate >= 0.8) mood = "happy";
    else if (adherenceRate >= 0.6) mood = "neutral";
    else if (adherenceRate >= 0.4) mood = "sad";
    else mood = "sick";

    const energy = Math.round(adherenceRate * 100);
    const hunger = 100 - energy;

    // Calculate streak: consecutive calendar days (back from today) where all scheduled doses were taken
    const activeMeds = medications.filter((m) => m.isActive);
    let streak = 0;
    let checkDate = new Date(now);

    for (let i = 0; i < 365; i++) {
      const dayStr = dateStr(checkDate);
      let allTaken = true;
      let anyScheduled = false;

      for (const med of activeMeds) {
        for (const time of med.scheduleTimes) {
          const scheduledFor = `${dayStr}T${time}:00`;
          const log = allLogs.find((l) => l.scheduledFor === scheduledFor && l.medicationId === med.id);
          anyScheduled = true;
          if (!log || log.status !== "taken") {
            allTaken = false;
          }
        }
      }

      if (!anyScheduled) {
        // No medications scheduled this day — don't count, move on
        checkDate = addDays(checkDate, -1);
        continue;
      }

      if (allTaken) {
        streak++;
        checkDate = addDays(checkDate, -1);
      } else {
        break;
      }
    }

    const currentBest = get().stats.bestStreak;
    const bestStreak = Math.max(streak, currentBest);

    const updated: PetStats = {
      ...get().stats,
      mood,
      energy,
      hunger,
      consistencyStreak: streak,
      bestStreak,
      lastCheckinAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db.pet_stats.put(updated);
    set({ stats: updated });
  },

  async updatePetName(name) {
    const updated: PetStats = {
      ...get().stats,
      petName: name,
      updatedAt: new Date().toISOString(),
    };
    await db.pet_stats.put(updated);
    set({ stats: updated });
  },
}));
