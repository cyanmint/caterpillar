import { useState } from "react";
import { useMedStore } from "../../stores/useMedStore";
import type { Medication } from "../../db";
import { PillEditor, PillSvgPreview } from "./PillEditor";

type ViewMode = "list" | "new" | "edit";

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function MedicationsView() {
  const medications = useMedStore((s) => s.medications);
  const updateMedication = useMedStore((s) => s.updateMedication);
  const deleteMedication = useMedStore((s) => s.deleteMedication);

  const [mode, setMode] = useState<ViewMode>("list");
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleEdit(med: Medication) {
    setEditingMed(med);
    setMode("edit");
  }

  function handleDone() {
    setEditingMed(null);
    setMode("list");
  }

  async function handleToggleActive(med: Medication) {
    await updateMedication(med.id, { isActive: !med.isActive });
  }

  async function handleDelete(id: string) {
    await deleteMedication(id);
    setConfirmDeleteId(null);
  }

  if (mode === "new") {
    return (
      <div className="mx-auto max-w-xl p-4">
        <PillEditor key="new" onDone={handleDone} />
      </div>
    );
  }

  if (mode === "edit" && editingMed) {
    return (
      <div className="mx-auto max-w-xl p-4">
        <PillEditor key={editingMed.id} editingMed={editingMed} onDone={handleDone} />
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Medications</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {medications.length} medication{medications.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode("new")}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add New
        </button>
      </div>

      {medications.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-slate-500">No medications yet.</p>
          <p className="mt-1 text-sm text-slate-400">Tap "+ Add New" to create one.</p>
        </div>
      )}

      {medications.map((med) => (
        <section
          key={med.id}
          className={`rounded-xl border bg-white p-4 shadow-sm ${med.isActive ? "border-slate-200" : "border-slate-200 opacity-60"}`}
        >
          {/* Header row */}
          <div className="flex items-start gap-3">
            <PillSvgPreview
              shape={med.shape}
              primaryColor={med.primaryColor}
              secondaryColor={med.secondaryColor ?? "#2E86DE"}
              divider={med.divider}
              drugName={med.drugName}
              imprintText={med.imprintText}
              className="h-14 w-24 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">{med.drugName}</p>
              {med.dosageLabel && <p className="text-sm text-slate-500">{med.dosageLabel}</p>}
              {med.imprintText && (
                <p className="text-xs text-slate-400">Imprint: {med.imprintText.toUpperCase()}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {med.scheduleTimes.length > 0
                  ? med.scheduleTimes.map(formatTime).join(" · ")
                  : "No schedule times"}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                med.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {med.isActive ? "Active" : "Paused"}
            </span>
          </div>

          {/* Action row */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleEdit(med)}
              className="flex-1 rounded-md border border-slate-300 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ✏️ Edit
            </button>
            <button
              type="button"
              onClick={() => handleToggleActive(med)}
              className="flex-1 rounded-md border border-slate-300 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {med.isActive ? "⏸ Pause" : "▶ Resume"}
            </button>
            {confirmDeleteId === med.id ? (
              <>
                <button
                  type="button"
                  onClick={() => handleDelete(med.id)}
                  className="flex-1 rounded-md bg-red-600 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(med.id)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                🗑
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
