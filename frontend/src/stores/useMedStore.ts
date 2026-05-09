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
  setRemainingPills: (id: string, remainingPills: number) => Promise<void>;
  consumePill: (id: string, amount?: number) => Promise<void>;
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

  async setRemainingPills(id, remainingPills) {
    const safeRemaining = Math.max(0, Math.floor(remainingPills));
    await db.medications.update(id, { remainingPills: safeRemaining, updatedAt: new Date().toISOString() });
    await get().loadAll();
  },

  async consumePill(id, amount = 1) {
    const med = await db.medications.get(id);
    if (!med) return;
    const nextRemaining = Math.max(0, (med.remainingPills ?? 0) - Math.max(1, Math.floor(amount)));
    await db.medications.update(id, { remainingPills: nextRemaining, updatedAt: new Date().toISOString() });
    await get().loadAll();
  },
}));
