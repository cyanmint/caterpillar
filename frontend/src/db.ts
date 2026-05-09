import Dexie, { type Table } from "dexie";

export interface Medication {
  id: string;
  drugName: string;
  dosageLabel?: string;
  pillsPerBox?: number;
  shape: "oblong" | "round" | "capsule" | "triangular";
  primaryColor: string;
  secondaryColor?: string;
  divider: "none" | "half" | "quarter";
  svgMarkup: string;
  scheduleTimes: string[]; // e.g. ["08:00", "20:00"]
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoseLog {
  id: string;
  medicationId: string;
  scheduledFor: string; // ISO datetime "2025-05-09T08:00:00"
  takenAt?: string;
  status: "taken" | "missed" | "skipped";
  createdAt: string;
}

export interface PetStats {
  userId: string;
  petName: string;
  mood: "happy" | "neutral" | "sad" | "sick";
  energy: number;   // 0-100
  hunger: number;   // 0-100
  consistencyStreak: number;
  bestStreak: number;
  lastCheckinAt?: string;
  updatedAt: string;
}

class CaterpillarDB extends Dexie {
  medications!: Table<Medication, string>;
  dose_logs!: Table<DoseLog, string>;
  pet_stats!: Table<PetStats, string>;

  constructor() {
    super("caterpillarDB");
    this.version(1).stores({
      medications: "id, isActive, createdAt",
      dose_logs: "id, medicationId, scheduledFor, status",
      pet_stats: "userId",
    });
  }
}

export const db = new CaterpillarDB();
