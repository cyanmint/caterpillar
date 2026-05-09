import { useEffect, useState } from "react";
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

// Returns the nearest upcoming slot index (first slot whose time >= now and has no log)
function nextSlotIndex(
  slots: { time: string }[],
  logs: Map<string, DoseLog>,
  slotKeys: string[],
): number {
  const now = nowHHMM();
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].time >= now && !logs.has(slotKeys[i])) return i;
  }
  return -1;
}

export function ScheduleView() {
  const medications = useMedStore((s) => s.medications);
  const logDose = useMedStore((s) => s.logDose);
  const deleteLog = useMedStore((s) => s.deleteLog);
  const consumePill = useMedStore((s) => s.consumePill);
  const loadAll = useMedStore((s) => s.loadAll);
  const recalculate = usePetStore((s) => s.recalculate);
  const triggerReaction = usePetStore((s) => s.triggerReaction);
  const addSegment = usePetStore((s) => s.addSegment);

  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedLogs, setSelectedLogs] = useState<DoseLog[]>([]);
  const activeMeds = medications.filter((m) => m.isActive);

  const takenCount = selectedLogs.filter((l) => l.status === "taken").length;
  const totalScheduled = activeMeds.reduce((sum, m) => sum + m.scheduleTimes.length, 0);

  // Inline "Taken" form state
  const [takenSlot, setTakenSlot] = useState<string | null>(null);
  const [takenTime, setTakenTime] = useState(nowHHMM());
  const [takenDate, setTakenDate] = useState(todayStr());
  const [takenAmount, setTakenAmount] = useState<PillAmount>(1);
  const [busySlot, setBusySlot] = useState<string | null>(null);

  async function loadSelectedLogs(date: string) {
    const logs = await db.dose_logs.where("scheduledFor").startsWith(date).toArray();
    setSelectedLogs(logs);
  }

  useEffect(() => {
    void loadSelectedLogs(selectedDate);
    setTakenSlot(null);
  }, [selectedDate]);

  interface Slot {
    medicationId: string;
    scheduledFor: string;
    time: string;
  }

  const slots: Slot[] = activeMeds.flatMap((m) =>
    m.scheduleTimes.map((t) => ({
      medicationId: m.id,
      scheduledFor: `${selectedDate}T${t}:00`,
      time: t,
    })),
  );
  slots.sort((a, b) => a.time.localeCompare(b.time));

  const slotKeys = slots.map((s) => `${s.medicationId}|${s.scheduledFor}`);
  const logMap = new Map(selectedLogs.map((l) => [l.id, l]));
  const nextIdx = selectedDate === today ? nextSlotIndex(slots, logMap, slotKeys) : -1;

  function openTakenForm(slotKey: string) {
    setTakenSlot(slotKey);
    setTakenTime(nowHHMM());
    setTakenDate(selectedDate);
    setTakenAmount(1);
  }

  async function confirmTaken(medicationId: string, scheduledFor: string) {
    const slotKey = `${medicationId}|${scheduledFor}`;
    setBusySlot(slotKey);
    try {
      const takenAt = `${takenDate}T${takenTime}:00`;
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
      await loadSelectedLogs(selectedDate);
      setTakenSlot(null);
      triggerReaction("⭐");
      addSegment();
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
      await loadSelectedLogs(selectedDate);
      if (status === "skipped") triggerReaction("😕");
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
      await loadSelectedLogs(selectedDate);
    } finally {
      setBusySlot(null);
    }
  }

  function getLog(medicationId: string, scheduledFor: string) {
    return selectedLogs.find(
      (l) => l.medicationId === medicationId && l.scheduledFor === scheduledFor,
    );
  }

  // Dot + card color per status
  const dotColor: Record<DoseLog["status"], string> = {
    taken: "bg-green-500 border-green-600",
    skipped: "bg-yellow-400 border-yellow-500",
    missed: "bg-red-500 border-red-600",
  };
  const cardBorder: Record<DoseLog["status"], string> = {
    taken: "border-green-300 bg-green-50",
    skipped: "border-yellow-300 bg-yellow-50",
    missed: "border-red-300 bg-red-50",
  };
  const statusLabel: Record<DoseLog["status"], string> = {
    taken: "✓ Taken",
    skipped: "⟳ Skipped",
    missed: "✗ Missed",
  };

  return (
    <div className="flex flex-col gap-0 p-4">
      {/* Header */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 mb-6">
        <p className="text-sm text-slate-500">
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="text-xl font-bold text-slate-800">Schedule</h1>
        <div className="mt-2 max-w-xs">
          <label className="block text-xs font-medium text-slate-600">
            Date
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {takenCount} of {totalScheduled} doses taken
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-green-500 transition-all"
            style={{
              width: totalScheduled > 0 ? `${(takenCount / totalScheduled) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      {slots.length === 0 && (
        <div className="rounded-xl bg-white p-6 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">No medications scheduled.</p>
          <p className="text-sm text-slate-400 mt-1">Add a medication in the Pills tab.</p>
        </div>
      )}

      {/* Timeline */}
      {slots.length > 0 && (
        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-[3.25rem] top-3 bottom-3 w-0.5 bg-slate-200" />

          <div className="flex flex-col gap-5">
            {slots.map(({ medicationId, scheduledFor, time }, idx) => {
              const med = medications.find((m) => m.id === medicationId);
              if (!med) return null;
              const slotKey = `${medicationId}|${scheduledFor}`;
              const existingLog = getLog(medicationId, scheduledFor);
              const isBusy = busySlot === slotKey;
              const showTakenForm = takenSlot === slotKey;
              const isNext = idx === nextIdx;
              const isPast = selectedDate === today && time < nowHHMM() && !existingLog;

              // Dot appearance
              let dotClass =
                "h-4 w-4 rounded-full border-2 flex-shrink-0 relative z-10 ";
              if (existingLog) {
                dotClass += dotColor[existingLog.status];
              } else if (isNext) {
                dotClass += "bg-blue-500 border-blue-600 animate-pulse";
              } else if (isPast) {
                dotClass += "bg-slate-300 border-slate-400";
              } else {
                dotClass += "bg-white border-slate-400";
              }

              return (
                <div key={slotKey} className="flex items-start gap-3">
                  {/* Left: time + dot column */}
                  <div className="flex flex-col items-center w-[3.25rem] flex-shrink-0 pt-1">
                    <span
                      className={`text-[0.65rem] font-semibold leading-none mb-1.5 ${
                        isNext
                          ? "text-blue-600"
                          : existingLog
                            ? existingLog.status === "taken"
                              ? "text-green-700"
                              : existingLog.status === "skipped"
                                ? "text-yellow-700"
                                : "text-red-700"
                            : isPast
                              ? "text-slate-400"
                              : "text-slate-500"
                      }`}
                    >
                      {formatTime(time).replace(" ", "\n")}
                    </span>
                    <div className={dotClass} />
                  </div>

                  {/* Right: card */}
                  <div
                    className={`flex-1 min-w-0 rounded-xl border p-3 shadow-sm transition-colors ${
                      existingLog
                        ? cardBorder[existingLog.status]
                        : isNext
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    {/* Pill info row */}
                    <div className="flex items-center gap-3">
                      <PillSvgPreview
                        shape={med.shape}
                        primaryColor={med.primaryColor}
                        secondaryColor={med.secondaryColor ?? "#2E86DE"}
                        divider={med.divider}
                        customPath={undefined}
                        drugName={med.drugName}
                        imprintText={med.imprintText}
                        className="h-10 w-16 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate text-sm">
                          {med.drugName}
                        </p>
                        {med.dosageLabel && (
                          <p className="text-xs text-slate-500">{med.dosageLabel}</p>
                        )}
                        {existingLog?.status === "taken" && existingLog.takenAt && (
                          <p className="text-xs text-green-700 mt-0.5">
                            Taken{existingLog.takenAt.slice(0, 10) !== selectedDate ? ` on ${existingLog.takenAt.slice(0, 10)}` : ""}{" "}
                            at {formatTime(existingLog.takenAt.slice(11, 16))}
                            {existingLog.pillAmount && existingLog.pillAmount !== 1
                              ? ` · ${existingLog.pillAmount === 0.5 ? "½" : "¼"} pill`
                              : ""}
                          </p>
                        )}
                      </div>
                      {existingLog && (
                        <span
                          className={`text-xs font-semibold shrink-0 px-2 py-1 rounded-full ${
                            existingLog.status === "taken"
                              ? "bg-green-200 text-green-800"
                              : existingLog.status === "skipped"
                                ? "bg-yellow-200 text-yellow-800"
                                : "bg-red-200 text-red-800"
                          }`}
                        >
                          {statusLabel[existingLog.status]}
                        </span>
                      )}
                      {isNext && !existingLog && (
                        <span className="text-xs font-semibold shrink-0 px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          Next
                        </span>
                      )}
                    </div>

                    {/* Logged: undo */}
                    {existingLog && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleUndo(existingLog.id)}
                          disabled={isBusy}
                          className="w-full rounded-md border border-slate-300 py-1.5 text-xs font-medium text-slate-600 hover:bg-white/60 disabled:opacity-50"
                        >
                          ↩ Undo
                        </button>
                      </div>
                    )}

                    {/* Not logged: action buttons */}
                    {!existingLog && !showTakenForm && (
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openTakenForm(slotKey)}
                          disabled={isBusy}
                          className="flex-1 rounded-md bg-green-600 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          ✓ Taken
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLog(medicationId, scheduledFor, "skipped")}
                          disabled={isBusy}
                          className="flex-1 rounded-md bg-yellow-400 py-1.5 text-xs font-semibold text-slate-900 hover:bg-yellow-500 disabled:opacity-50"
                        >
                          ⟳ Skip
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLog(medicationId, scheduledFor, "missed")}
                          disabled={isBusy}
                          className="flex-1 rounded-md bg-red-500 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          ✗ Missed
                        </button>
                      </div>
                    )}

                    {/* Inline "Taken" detail form */}
                    {!existingLog && showTakenForm && (
                      <div className="mt-2 space-y-2 rounded-lg border border-green-200 bg-green-50 p-3">
                        <p className="text-xs font-semibold text-green-800">Log dose details</p>

                        <div className="grid grid-cols-2 gap-2">
                          {/* No max restriction — allows backdating and future pre-logging */}
                          <label className="block text-xs font-medium text-slate-700">
                            Date
                            <input
                              type="date"
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs"
                              value={takenDate}
                              onChange={(e) => setTakenDate(e.target.value)}
                            />
                          </label>
                          <label className="block text-xs font-medium text-slate-700">
                            Time
                            <input
                              type="time"
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs"
                              value={takenTime}
                              onChange={(e) => setTakenTime(e.target.value)}
                            />
                          </label>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-700 mb-1">Amount</p>
                          <div className="flex gap-1.5">
                            {PILL_AMOUNT_LABELS.map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setTakenAmount(value)}
                                className={`flex-1 rounded-md border py-1 text-xs font-semibold transition-colors ${
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

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => confirmTaken(medicationId, scheduledFor)}
                            disabled={isBusy}
                            className="flex-1 rounded-md bg-green-600 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {isBusy ? "Saving…" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTakenSlot(null)}
                            disabled={isBusy}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
