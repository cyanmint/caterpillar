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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ScheduleView() {
  const medications = useMedStore((s) => s.medications);
  const todayLogs = useMedStore((s) => s.todayLogs);
  const logDose = useMedStore((s) => s.logDose);
  const consumePill = useMedStore((s) => s.consumePill);
  const loadAll = useMedStore((s) => s.loadAll);
  const recalculate = usePetStore((s) => s.recalculate);

  const today = todayStr();
  const activeMeds = medications.filter((m) => m.isActive);

  const takenCount = todayLogs.filter((l) => l.status === "taken").length;
  const totalScheduled = activeMeds.reduce((sum, m) => sum + m.scheduleTimes.length, 0);

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

  // Sort by time
  slots.sort((a, b) => a.time.localeCompare(b.time));

  async function handleLog(
    medicationId: string,
    scheduledFor: string,
    status: DoseLog["status"],
  ) {
    const log: DoseLog = {
      id: `${medicationId}|${scheduledFor}`,
      medicationId,
      scheduledFor,
      takenAt: status === "taken" ? new Date().toISOString() : undefined,
      status,
      createdAt: new Date().toISOString(),
    };
    await logDose(log);
    if (status === "taken") {
      await consumePill(medicationId, 1);
    }
    // Reload all logs then recalculate pet
    const allLogs = await db.dose_logs.toArray();
    await recalculate(allLogs, medications);
    await loadAll();
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
        const existingLog = getLog(medicationId, scheduledFor);

        return (
          <div
            key={`${medicationId}|${scheduledFor}`}
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
              </div>
              {existingLog && (
                <span className="text-sm font-semibold">
                  {statusLabel[existingLog.status]}
                </span>
              )}
            </div>

            {!existingLog && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleLog(medicationId, scheduledFor, "taken")}
                  className="flex-1 rounded-md bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  ✓ Taken
                </button>
                <button
                  type="button"
                  onClick={() => handleLog(medicationId, scheduledFor, "skipped")}
                  className="flex-1 rounded-md bg-yellow-400 py-2 text-sm font-medium text-slate-900 hover:bg-yellow-500"
                >
                  ⟳ Skip
                </button>
                <button
                  type="button"
                  onClick={() => handleLog(medicationId, scheduledFor, "missed")}
                  className="flex-1 rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600"
                >
                  ✗ Missed
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
