import { useState } from "react";
import { useMedStore } from "../../stores/useMedStore";
import { usePetStore } from "../../stores/usePetStore";
import { PillSvgPreview } from "../pills/PillEditor";
import { db, type DoseLog } from "../../db";

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function nowHHMM(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

type PillAmount = 1 | 0.5 | 0.25;

const PILL_AMOUNT_LABELS: { value: PillAmount; label: string }[] = [
  { value: 1, label: "Full" },
  { value: 0.5, label: "½" },
  { value: 0.25, label: "¼" },
];

export function ScheduleView() {
  const medications = useMedStore((s) => s.medications);
  const todayLogs = useMedStore((s) => s.todayLogs);
  const logDose = useMedStore((s) => s.logDose);
  const deleteLog = useMedStore((s) => s.deleteLog);
  const consumePill = useMedStore((s) => s.consumePill);
  const loadAll = useMedStore((s) => s.loadAll);
  const recalculate = usePetStore((s) => s.recalculate);

  const today = todayStr();
  const activeMeds = medications.filter((m) => m.isActive);

  const takenCount = todayLogs.filter((l) => l.status === "taken").length;
  const totalScheduled = activeMeds.reduce((sum, m) => sum + m.scheduleTimes.length, 0);

  // Inline "Taken" form state
  const [takenSlot, setTakenSlot] = useState<string | null>(null);
  const [takenTime, setTakenTime] = useState(nowHHMM());
  const [takenAmount, setTakenAmount] = useState<PillAmount>(1);
  const [busySlot, setBusySlot] = useState<string | null>(null);

  interface Slot {
    medicationId: string;
    scheduledFor: string;
    time: string;
  }

  const slots: Slot[] = activeMeds.flatMap((m) =>
    m.scheduleTimes.map((t) => ({
      medicationId: m.id,
      scheduledFor: `${today}T${t}:00`,
      time: t,
    })),
  );

  slots.sort((a, b) => a.time.localeCompare(b.time));

  function openTakenForm(slotKey: string) {
    setTakenSlot(slotKey);
    setTakenTime(nowHHMM());
    setTakenAmount(1);
  }

  async function confirmTaken(medicationId: string, scheduledFor: string) {
    const slotKey = `${medicationId}|${scheduledFor}`;
    setBusySlot(slotKey);
    try {
      const takenAt = `${today}T${takenTime}:00`;
      const log: DoseLog = {
        id: slotKey,
        medicationId,
        scheduledFor,
        takenAt,
        pillAmount: takenAmount,
        status: "taken",
        createdAt: new Date().toISOString(),
      };
      await logDose(log);
      await consumePill(medicationId, takenAmount);
      const allLogs = await db.dose_logs.toArray();
      await recalculate(allLogs, medications);
      await loadAll();
      setTakenSlot(null);
    } finally {
      setBusySlot(null);
    }
  }

  async function handleLog(
    medicationId: string,
    scheduledFor: string,
    status: "missed" | "skipped",
  ) {
    const slotKey = `${medicationId}|${scheduledFor}`;
    setBusySlot(slotKey);
    try {
      const log: DoseLog = {
        id: slotKey,
        medicationId,
        scheduledFor,
        status,
        createdAt: new Date().toISOString(),
      };
      await logDose(log);
      const allLogs = await db.dose_logs.toArray();
      await recalculate(allLogs, medications);
      await loadAll();
    } finally {
      setBusySlot(null);
    }
  }

  async function handleUndo(logId: string) {
    setBusySlot(logId);
    try {
      await deleteLog(logId);
      const allLogs = await db.dose_logs.toArray();
      await recalculate(allLogs, medications);
    } finally {
      setBusySlot(null);
    }
  }

  function getLog(medicationId: string, scheduledFor: string) {
    return todayLogs.find((l) => l.medicationId === medicationId && l.scheduledFor === scheduledFor);
  }

  const statusStyle: Record<DoseLog["status"], string> = {
    taken: "bg-green-100 border-green-400 text-green-800",
    skipped: "bg-yellow-100 border-yellow-400 text-yellow-800",
    missed: "bg-red-100 border-red-400 text-red-800",
  };

  const statusLabel: Record<DoseLog["status"], string> = {
    taken: "✓ Taken",
    skipped: "⟳ Skipped",
    missed: "✗ Missed",
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-xl font-bold text-slate-800">Today's Schedule</h1>
        <p className="mt-1 text-sm text-slate-600">
          {takenCount} of {totalScheduled} doses taken today
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-green-500 transition-all"
            style={{ width: totalScheduled > 0 ? `${(takenCount / totalScheduled) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {slots.length === 0 && (
        <div className="rounded-xl bg-white p-6 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">No medications scheduled.</p>
          <p className="text-sm text-slate-400 mt-1">Add a medication in the Pills tab.</p>
        </div>
      )}

      {slots.map(({ medicationId, scheduledFor, time }) => {
        const med = medications.find((m) => m.id === medicationId);
        if (!med) return null;
        const slotKey = `${medicationId}|${scheduledFor}`;
        const existingLog = getLog(medicationId, scheduledFor);
        const isBusy = busySlot === slotKey;
        const showTakenForm = takenSlot === slotKey;

        return (
          <div
            key={slotKey}
            className={`rounded-xl border bg-white p-4 shadow-sm ${existingLog ? statusStyle[existingLog.status] : "border-slate-200"}`}
          >
            <div className="flex items-center gap-3">
              <PillSvgPreview
                shape={med.shape}
                primaryColor={med.primaryColor}
                secondaryColor={med.secondaryColor ?? "#2E86DE"}
                divider={med.divider}
                customPath={undefined}
                drugName={med.drugName}
                imprintText={med.imprintText}
                className="h-12 w-20 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{med.drugName}</p>
                {med.dosageLabel && (
                  <p className="text-sm text-slate-500">{med.dosageLabel}</p>
                )}
                <p className="text-sm font-medium text-slate-600">{formatTime(time)}</p>
                {existingLog?.status === "taken" && existingLog.takenAt && (
                  <p className="text-xs text-slate-500">
                    Taken at {formatTime(existingLog.takenAt.slice(11, 16))}
                    {existingLog.pillAmount && existingLog.pillAmount !== 1
                      ? ` · ${existingLog.pillAmount === 0.5 ? "½" : "¼"} pill`
                      : ""}
                  </p>
                )}
              </div>
              {existingLog && (
                <span className="text-sm font-semibold shrink-0">
                  {statusLabel[existingLog.status]}
                </span>
              )}
            </div>

            {/* Logged: show undo */}
            {existingLog && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleUndo(existingLog.id)}
                  disabled={isBusy}
                  className="w-full rounded-md border border-slate-300 py-1.5 text-sm font-medium text-slate-600 hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ↩ Undo
                </button>
              </div>
            )}

            {/* Not logged: action buttons */}
            {!existingLog && !showTakenForm && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openTakenForm(slotKey)}
                  disabled={isBusy}
                  className="flex-1 rounded-md bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Taken
                </button>
                <button
                  type="button"
                  onClick={() => handleLog(medicationId, scheduledFor, "skipped")}
                  disabled={isBusy}
                  className="flex-1 rounded-md bg-yellow-400 py-2 text-sm font-medium text-slate-900 hover:bg-yellow-500 disabled:opacity-50"
                >
                  ⟳ Skip
                </button>
                <button
                  type="button"
                  onClick={() => handleLog(medicationId, scheduledFor, "missed")}
                  disabled={isBusy}
                  className="flex-1 rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  ✗ Missed
                </button>
              </div>
            )}

            {/* Inline "Taken" detail form */}
            {!existingLog && showTakenForm && (
              <div className="mt-3 space-y-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-semibold text-green-800">Log dose details</p>

                <label className="block text-xs font-medium text-slate-700">
                  Time taken
                  <input
                    type="time"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
                    value={takenTime}
                    onChange={(e) => setTakenTime(e.target.value)}
                  />
                </label>

                <div>
                  <p className="text-xs font-medium text-slate-700 mb-1">Amount</p>
                  <div className="flex gap-2">
                    {PILL_AMOUNT_LABELS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTakenAmount(value)}
                        className={`flex-1 rounded-md border py-1.5 text-sm font-semibold transition-colors ${
                          takenAmount === value
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => confirmTaken(medicationId, scheduledFor)}
                    disabled={isBusy}
                    className="flex-1 rounded-md bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isBusy ? "Saving…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTakenSlot(null)}
                    disabled={isBusy}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
