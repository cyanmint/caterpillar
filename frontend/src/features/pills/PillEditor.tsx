import { useMemo, useState } from "react";

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
  onSave?: (draft: PillTemplateDraft, svgMarkup: string) => Promise<void> | void;
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

export function PillEditor({ initialValue, highContrast = false, onSave }: PillEditorProps) {
  const [drugName, setDrugName] = useState(initialValue?.drugName ?? "");
  const [shape, setShape] = useState<PillShape>(initialValue?.shape ?? "oblong");
  const [primaryColor, setPrimaryColor] = useState(initialValue?.primaryColor ?? "#FFFFFF");
  const [secondaryColor, setSecondaryColor] = useState(initialValue?.secondaryColor ?? "#2E86DE");
  const [divider, setDivider] = useState<PillDivider>(initialValue?.divider ?? "none");
  const [customPath, setCustomPath] = useState(initialValue?.customPath ?? "");
  const [isSaving, setIsSaving] = useState(false);

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
    return `
<svg viewBox="0 0 256 140" role="img" aria-label="${drugName || "pill template"}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pillGradient" x1="0" x2="1">
      <stop offset="0%" stop-color="${primaryColor}" />
      <stop offset="100%" stop-color="${secondaryColor}" />
    </linearGradient>
  </defs>
  <path d="${activePath}" fill="url(#pillGradient)" stroke="${contrastStroke}" stroke-width="${highContrast ? 4 : 2}" />
  ${dividerMarkup}
</svg>`.trim();
  }, [activePath, dividerMarkup, drugName, highContrast, primaryColor, secondaryColor]);

  async function handleSave() {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(
        {
          drugName,
          shape,
          primaryColor,
          secondaryColor,
          divider,
          customPath: customPath || undefined,
        },
        svgMarkup,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-4 text-slate-900 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Pill Editor</h2>
        <p className="text-sm text-slate-600">Assemble a 1:1 vector pill template and save to the global repository.</p>
      </header>

      <label className="block text-sm font-medium">
        Drug name
        <input
          className="mt-1 w-full rounded-md border border-slate-300 p-2"
          value={drugName}
          onChange={(event) => setDrugName(event.target.value)}
          placeholder="e.g. Metformin"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Shape
          <select
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
            value={shape}
            onChange={(event) => setShape(event.target.value as PillShape)}
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
            onChange={(event) => setDivider(event.target.value as PillDivider)}
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
          <input id="pill-primary-color" className="mt-1 block h-10 w-full rounded-md border border-slate-300 p-1" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
        </label>
        <label className="block text-sm font-medium" htmlFor="pill-secondary-color">
          Secondary color
          <input id="pill-secondary-color" className="mt-1 block h-10 w-full rounded-md border border-slate-300 p-1" type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} />
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

      <label className="block text-sm font-medium">
        Custom SVG path (optional)
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
          value={customPath}
          onChange={(event) => setCustomPath(event.target.value)}
          placeholder="Paste path d=... to override preset shape"
        />
      </label>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <svg viewBox="0 0 256 140" role="img" aria-live="polite" aria-label={drugName || "pill template"} className="mx-auto h-28 w-full max-w-xs">
          <defs>
            <linearGradient id="pillGradientPreview" x1="0" x2="1">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
          </defs>
          <path d={activePath} fill="url(#pillGradientPreview)" stroke={highContrast ? "#000000" : "#333333"} strokeWidth={highContrast ? 4 : 2} />
          {divider !== "none" && <line x1="128" y1="32" x2="128" y2="108" stroke="#111111" strokeWidth="4" strokeLinecap="round" />}
          {divider === "quarter" && (
            <>
              <line x1="84" y1="32" x2="84" y2="108" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
              <line x1="172" y1="32" x2="172" y2="108" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
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
