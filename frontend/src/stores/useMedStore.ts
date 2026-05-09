import { create } from "zustand";
import { db, type Medication, type DoseLog } from "../db";

interface MedState {
  medications: Medication[];
  todayLogs: DoseLog[];
  loadAll: () => Promise<void>;
  addMedication: (m: Medication) => Promise<void>;
  updateMedication: (id: string, patch: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  logDose: (log: DoseLog) => Promise<void>;
  loadTodayLogs: () => Promise<void>;
}

function todayPrefix(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export const useMedStore = create<MedState>((set, get) => ({
  medications: [],
  todayLogs: [],

  async loadAll() {
    const medications = await db.medications.toArray();
    set({ medications });
  },

  async addMedication(m) {
    await db.medications.put(m);
    await get().loadAll();
  },

  async updateMedication(id, patch) {
    await db.medications.update(id, { ...patch, updatedAt: new Date().toISOString() });
    await get().loadAll();
  },

  async deleteMedication(id) {
    await db.medications.delete(id);
    await get().loadAll();
  },

  async logDose(log) {
    await db.dose_logs.put(log);
    await get().loadTodayLogs();
  },

  async loadTodayLogs() {
    const prefix = todayPrefix();
    const todayLogs = await db.dose_logs
      .where("scheduledFor")
      .startsWith(prefix)
      .toArray();
    set({ todayLogs });
  },
}));
