import { useMemo, useState } from "react";
import { useMedStore } from "../../stores/useMedStore";
import type { Medication } from "../../db";

type PillShape = "oblong" | "round" | "capsule" | "triangular";
type PillDivider = "none" | "half" | "quarter";

export interface PillTemplateDraft {
  drugName: string;
  shape: PillShape;
  primaryColor: string;
  secondaryColor?: string;
  divider: PillDivider;
  customPath?: string;
}

interface PillEditorProps {
  initialValue?: Partial<PillTemplateDraft>;
  highContrast?: boolean;
}

const shapePath: Record<PillShape, string> = {
  oblong: "M 40 70 C 40 48, 56 32, 78 32 H 178 C 200 32, 216 48, 216 70 C 216 92, 200 108, 178 108 H 78 C 56 108, 40 92, 40 70 Z",
  round: "M 128 32 A 48 48 0 1 1 127.9 32 Z",
  capsule: "M 64 70 C 64 49, 79 34, 100 34 H 156 C 177 34, 192 49, 192 70 C 192 91, 177 106, 156 106 H 100 C 79 106, 64 91, 64 70 Z",
  triangular: "M 128 34 L 210 108 H 46 Z",
};

const commonMedicalPalette = [
  "#FFFFFF",
  "#F2F2F2",
  "#E85D75",
  "#F39C12",
  "#2E86DE",
  "#16A085",
  "#8E44AD",
  "#2C3E50",
];

export function PillSvgPreview({
  shape,
  primaryColor,
  secondaryColor,
  divider,
  customPath,
  highContrast,
  drugName,
  className,
}: {
  shape: PillShape;
  primaryColor: string;
  secondaryColor: string;
  divider: PillDivider;
  customPath?: string;
  highContrast?: boolean;
  drugName?: string;
  className?: string;
}) {
  const activePath = customPath?.trim() || shapePath[shape];
  const gradId = `pg-${shape}-${primaryColor.replace("#", "")}-${secondaryColor.replace("#", "")}`;
  return (
    <svg
      viewBox="0 0 256 140"
      role="img"
      aria-label={drugName || "pill"}
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="1">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={secondaryColor} />
        </linearGradient>
      </defs>
      <path
        d={activePath}
        fill={`url(#${gradId})`}
        stroke={highContrast ? "#000000" : "#333333"}
        strokeWidth={highContrast ? 4 : 2}
      />
      {divider !== "none" && (
        <line x1="128" y1="32" x2="128" y2="108" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
      )}
      {divider === "quarter" && (
        <>
          <line x1="84" y1="32" x2="84" y2="108" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
          <line x1="172" y1="32" x2="172" y2="108" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function PillEditor({ initialValue, highContrast = false }: PillEditorProps) {
  const addMedication = useMedStore((s) => s.addMedication);

  const [drugName, setDrugName] = useState(initialValue?.drugName ?? "");
  const [dosageLabel, setDosageLabel] = useState("");
  const [pillsPerBox, setPillsPerBox] = useState<string>("");
  const [shape, setShape] = useState<PillShape>(initialValue?.shape ?? "oblong");
  const [primaryColor, setPrimaryColor] = useState(initialValue?.primaryColor ?? "#FFFFFF");
  const [secondaryColor, setSecondaryColor] = useState(initialValue?.secondaryColor ?? "#2E86DE");
  const [divider, setDivider] = useState<PillDivider>(initialValue?.divider ?? "none");
  const [customPath, setCustomPath] = useState(initialValue?.customPath ?? "");
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(["08:00"]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string>("");

  const activePath = customPath.trim() || shapePath[shape];

  const dividerMarkup = useMemo(() => {
    if (divider === "none") return "";
    const base = `<line x1="128" y1="32" x2="128" y2="108" stroke="#111111" stroke-width="4" stroke-linecap="round" />`;
    if (divider === "half") return base;
    return [
      base,
      `<line x1="84" y1="32" x2="84" y2="108" stroke="#111111" stroke-width="2" stroke-linecap="round" />`,
      `<line x1="172" y1="32" x2="172" y2="108" stroke="#111111" stroke-width="2" stroke-linecap="round" />`,
    ].join("");
  }, [divider]);

  const svgMarkup = useMemo(() => {
    const contrastStroke = highContrast ? "#000000" : "#333333";
    const gradId = "pillGradient";
    return `<svg viewBox="0 0 256 140" role="img" aria-label="${drugName || "pill template"}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${gradId}" x1="0" x2="1"><stop offset="0%" stop-color="${primaryColor}" /><stop offset="100%" stop-color="${secondaryColor}" /></linearGradient></defs><path d="${activePath}" fill="url(#${gradId})" stroke="${contrastStroke}" stroke-width="${highContrast ? 4 : 2}" />${dividerMarkup}</svg>`;
  }, [activePath, dividerMarkup, drugName, highContrast, primaryColor, secondaryColor]);

  function addTime() {
    setScheduleTimes((prev) => [...prev, "12:00"]);
  }

  function removeTime(idx: number) {
    setScheduleTimes((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTime(idx: number, val: string) {
    setScheduleTimes((prev) => prev.map((t, i) => (i === idx ? val : t)));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleSave() {
    if (!drugName.trim()) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const med: Medication = {
        id: crypto.randomUUID(),
        drugName: drugName.trim(),
        dosageLabel: dosageLabel.trim() || undefined,
        pillsPerBox: pillsPerBox ? parseInt(pillsPerBox, 10) : undefined,
        shape,
        primaryColor,
        secondaryColor,
        divider,
        svgMarkup,
        scheduleTimes: scheduleTimes.filter(Boolean),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      await addMedication(med);
      showToast("✅ Medication saved!");
      // Reset form
      setDrugName("");
      setDosageLabel("");
      setPillsPerBox("");
      setScheduleTimes(["08:00"]);
      setCustomPath("");
    } catch {
      showToast("❌ Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-4 text-slate-900 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Pill Editor</h2>
        <p className="text-sm text-slate-600">Design your medication and save it to your schedule.</p>
        {toast && (
          <p className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800" aria-live="polite">
            {toast}
          </p>
        )}
      </header>

      <label className="block text-sm font-medium">
        Drug name
        <input
          className="mt-1 w-full rounded-md border border-slate-300 p-2"
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          placeholder="e.g. Metformin"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Dosage label
          <input
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
            value={dosageLabel}
            onChange={(e) => setDosageLabel(e.target.value)}
            placeholder="e.g. 500mg"
          />
        </label>
        <label className="block text-sm font-medium">
          Pills per box
          <input
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
            type="number"
            min="1"
            value={pillsPerBox}
            onChange={(e) => setPillsPerBox(e.target.value)}
            placeholder="e.g. 30"
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Shape
          <select
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
            value={shape}
            onChange={(e) => setShape(e.target.value as PillShape)}
          >
            <option value="oblong">Oblong</option>
            <option value="round">Round</option>
            <option value="capsule">Capsule</option>
            <option value="triangular">Triangular</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Divider
          <select
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
            value={divider}
            onChange={(e) => setDivider(e.target.value as PillDivider)}
          >
            <option value="none">None</option>
            <option value="half">Half score</option>
            <option value="quarter">Quarter score</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="pill-primary-color">
          Primary color
          <input
            id="pill-primary-color"
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 p-1"
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="pill-secondary-color">
          Secondary color
          <input
            id="pill-secondary-color"
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 p-1"
            type="color"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {commonMedicalPalette.map((color) => (
          <button
            key={color}
            type="button"
            className="h-8 w-8 rounded-full border border-slate-300"
            style={{ backgroundColor: color }}
            onClick={() => setPrimaryColor(color)}
            aria-label={`Set primary color ${color}`}
          />
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Schedule times</p>
        {scheduleTimes.map((t, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="time"
              className="rounded-md border border-slate-300 p-2 text-sm"
              value={t}
              onChange={(e) => updateTime(idx, e.target.value)}
            />
            {scheduleTimes.length > 1 && (
              <button
                type="button"
                onClick={() => removeTime(idx)}
                className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                aria-label="Remove time"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addTime}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
        >
          + Add time
        </button>
      </div>

      <label className="block text-sm font-medium">
        Custom SVG path (optional)
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
          value={customPath}
          onChange={(e) => setCustomPath(e.target.value)}
          placeholder="Paste path d=... to override preset shape"
        />
      </label>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <PillSvgPreview
          shape={shape}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          divider={divider}
          customPath={customPath}
          highContrast={highContrast}
          drugName={drugName}
          className="mx-auto h-28 w-full max-w-xs"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !drugName.trim()}
        className="w-full rounded-md bg-slate-900 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save Pill Template"}
      </button>
    </section>
  );
}
