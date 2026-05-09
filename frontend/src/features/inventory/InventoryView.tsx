import { useState } from "react";
import { useMedStore } from "../../stores/useMedStore";
import { PillSvgPreview } from "../pills/PillEditor";

export function InventoryView() {
  const medications = useMedStore((s) => s.medications);
  const setRemainingPills = useMedStore((s) => s.setRemainingPills);

  const activeMeds = medications.filter((m) => m.isActive);
  const [busyId, setBusyId] = useState<string>("");

  async function adjust(id: string, current: number, delta: number) {
    setBusyId(id);
    try {
      await setRemainingPills(id, current + delta);
    } finally {
      setBusyId("");
    }
  }

  async function restock(id: string, pillsPerBox?: number) {
    setBusyId(id);
    try {
      await setRemainingPills(id, pillsPerBox ?? 0);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800">Inventory</h1>
        <p className="mt-1 text-sm text-slate-600">Manage remaining pills for each medication.</p>
      </div>

      {activeMeds.length === 0 && (
        <div className="rounded-xl bg-white p-6 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">No medications yet.</p>
          <p className="text-sm text-slate-400 mt-1">Add one in the Pills tab first.</p>
        </div>
      )}

      {activeMeds.map((med) => {
        const remaining = med.remainingPills ?? 0;
        const low = remaining <= 5;
        const isBusy = busyId === med.id;

        return (
          <section key={med.id} className="rounded-xl border bg-white p-4 shadow-sm border-slate-200">
            <div className="flex items-center gap-3">
              <PillSvgPreview
                shape={med.shape}
                primaryColor={med.primaryColor}
                secondaryColor={med.secondaryColor ?? "#2E86DE"}
                divider={med.divider}
                drugName={med.drugName}
                imprintText={med.imprintText}
                className="h-12 w-20 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{med.drugName}</p>
                {med.dosageLabel && <p className="text-sm text-slate-500">{med.dosageLabel}</p>}
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  low ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {low ? "Low stock" : "In stock"}
              </span>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Remaining pills</p>
                <p className="text-2xl font-bold text-slate-900">{remaining}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Per box</p>
                <p className="text-sm font-medium text-slate-700">{med.pillsPerBox ?? 0}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => adjust(med.id, remaining, -1)}
                disabled={isBusy || remaining <= 0}
                className="rounded-md border border-slate-300 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => adjust(med.id, remaining, 1)}
                disabled={isBusy}
                className="rounded-md border border-slate-300 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => adjust(med.id, remaining, 10)}
                disabled={isBusy}
                className="rounded-md border border-slate-300 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => restock(med.id, med.pillsPerBox)}
                disabled={isBusy}
                className="rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Restock
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
