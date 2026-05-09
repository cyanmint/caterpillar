import { ChangeEvent, useMemo, useState } from 'react';

type InputChange = ChangeEvent<HTMLInputElement>;

import { Download, UploadCloud } from 'lucide-react';
import type { PillDivider, PillShape, PillTemplatePayload } from '../types/pill';

const SHAPES: PillShape[] = ['oblong', 'round', 'capsule', 'triangle'];
const DIVIDERS: PillDivider[] = ['none', 'half', 'quarter'];
const PALETTE = ['#f8fafc', '#fca5a5', '#fdba74', '#fde047', '#86efac', '#93c5fd', '#c4b5fd', '#f0abfc'];

interface PillEditorProps {
  onExport?: (payload: PillTemplatePayload) => void;
}

function buildShape(shape: PillShape, primaryColor: string, secondaryColor: string, highContrast: boolean) {
  const stroke = highContrast ? '#020617' : '#334155';
  const strokeWidth = highContrast ? 5 : 3;

  switch (shape) {
    case 'round':
      return <circle cx="128" cy="128" r="76" fill={primaryColor} stroke={stroke} strokeWidth={strokeWidth} />;
    case 'capsule':
      return (
        <g>
          <path d="M52 128a52 52 0 0 1 52-52h48a52 52 0 0 1 0 104h-48a52 52 0 0 1-52-52Z" fill={primaryColor} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M128 77v102" stroke={secondaryColor} strokeWidth="8" strokeLinecap="round" opacity="0.55" />
        </g>
      );
    case 'triangle':
      return <path d="M128 48 214 194H42L128 48Z" fill={primaryColor} stroke={stroke} strokeLinejoin="round" strokeWidth={strokeWidth} />;
    case 'oblong':
    default:
      return <rect x="42" y="78" width="172" height="100" rx="50" fill={primaryColor} stroke={stroke} strokeWidth={strokeWidth} />;
  }
}

function buildDivider(divider: PillDivider, highContrast: boolean) {
  const stroke = highContrast ? '#020617' : '#475569';
  const common = { stroke, strokeWidth: highContrast ? 7 : 5, strokeLinecap: 'round' as const };

  if (divider === 'half') {
    return <path d="M128 62v132" {...common} />;
  }

  if (divider === 'quarter') {
    return (
      <g>
        <path d="M128 62v132" {...common} />
        <path d="M62 128h132" {...common} />
      </g>
    );
  }

  return null;
}

function readSvgFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function PillEditor({ onExport }: PillEditorProps) {
  const [drugName, setDrugName] = useState('Daily vitamin');
  const [dosageLabel, setDosageLabel] = useState('10 mg');
  const [pillsPerBox, setPillsPerBox] = useState(30);
  const [shape, setShape] = useState<PillShape>('oblong');
  const [divider, setDivider] = useState<PillDivider>('half');
  const [primaryColor, setPrimaryColor] = useState('#93c5fd');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [imprint, setImprint] = useState('AM');
  const [customSvg, setCustomSvg] = useState('');
  const [isHighContrast, setHighContrast] = useState(true);

  const generatedSvg = useMemo(() => {
    if (customSvg.trim().startsWith('<svg')) {
      return customSvg;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${drugName} pill template">\n${documentFragmentSafeSvg(shape, divider, primaryColor, secondaryColor, imprint, isHighContrast)}\n</svg>`;
  }, [customSvg, divider, drugName, imprint, isHighContrast, primaryColor, secondaryColor, shape]);

  async function handleSvgUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const svgText = await readSvgFile(file);
    setCustomSvg(svgText);
  }

  function exportTemplate() {
    const payload: PillTemplatePayload = {
      drugName,
      dosageLabel,
      pillsPerBox,
      shape,
      primaryColor,
      secondaryColor,
      divider,
      svg: generatedSvg,
      imprint,
      isHighContrast,
    };
    onExport?.(payload);
  }

  return (
    <section className="card high-contrast" aria-labelledby="pill-editor-title">
      <h2 id="pill-editor-title">1:1 Pill Vector Editor</h2>
      <p>Build an accessible medication visual from presets or import a custom SVG path/template.</p>

      <div className="grid-layout">
        <div aria-live="polite">
          <svg viewBox="0 0 256 256" role="img" aria-label={`${drugName} ${shape} pill preview`} width="100%" height="100%">
            {buildShape(shape, primaryColor, secondaryColor, isHighContrast)}
            {buildDivider(divider, isHighContrast)}
            {imprint && (
              <text x="128" y="138" textAnchor="middle" fontSize="32" fontWeight="700" fill={isHighContrast ? '#020617' : '#334155'}>
                {imprint.slice(0, 6)}
              </text>
            )}
          </svg>
        </div>

        <div className="control-grid">
          <label>
            Drug/template name
            <input value={drugName} onChange={(event: InputChange) => setDrugName(event.target.value)} aria-describedby="drug-help" />
          </label>
          <span id="drug-help" className="sr-only">Use the label a caregiver or patient would search for.</span>

          <label>
            Dosage
            <input value={dosageLabel} onChange={(event: InputChange) => setDosageLabel(event.target.value)} placeholder="Example: 10 mg" />
          </label>

          <label>
            Pills per box
            <input type="number" min="1" max="1000" inputMode="numeric" value={pillsPerBox} onChange={(event: InputChange) => setPillsPerBox(Number(event.target.value))} />
          </label>

          <fieldset>
            <legend>Shape preset</legend>
            <div className="touch-row">
              {SHAPES.map((item) => (
                <button key={item} type="button" className="pill-button" aria-pressed={shape === item} onClick={() => setShape(item)}>
                  {item}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Common medical palettes</legend>
            <div className="touch-row">
              {PALETTE.map((color) => (
                <button key={color} type="button" className="pill-button" style={{ background: color, color: '#020617' }} aria-label={`Use ${color}`} onClick={() => setPrimaryColor(color)} />
              ))}
            </div>
          </fieldset>

          <label>
            Primary color
            <input type="color" value={primaryColor} onChange={(event: InputChange) => setPrimaryColor(event.target.value)} />
          </label>
          <label>
            Secondary score color
            <input type="color" value={secondaryColor} onChange={(event: InputChange) => setSecondaryColor(event.target.value)} />
          </label>

          <fieldset>
            <legend>Divider / score</legend>
            <div className="touch-row">
              {DIVIDERS.map((item) => (
                <button key={item} type="button" className="pill-button" aria-pressed={divider === item} onClick={() => setDivider(item)}>
                  {item}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            Imprint
            <input value={imprint} maxLength={6} onChange={(event: InputChange) => setImprint(event.target.value.toUpperCase())} />
          </label>

          <label className="touch-row">
            <input type="checkbox" checked={isHighContrast} onChange={(event: InputChange) => setHighContrast(event.target.checked)} />
            High contrast outlines
          </label>

          <label className="pill-button">
            <UploadCloud aria-hidden="true" /> Upload custom SVG
            <input className="sr-only" type="file" accept="image/svg+xml,.svg" onChange={handleSvgUpload} />
          </label>

          <button className="pill-button" type="button" onClick={exportTemplate}>
            <Download aria-hidden="true" /> Export for Pill Repo
          </button>
        </div>
      </div>
    </section>
  );
}

function documentFragmentSafeSvg(
  shape: PillShape,
  divider: PillDivider,
  primaryColor: string,
  secondaryColor: string,
  imprint: string,
  highContrast: boolean,
) {
  const stroke = highContrast ? '#020617' : '#334155';
  const dividerStroke = highContrast ? '#020617' : '#475569';
  const escapedImprint = imprint.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
  const shapeMarkup = {
    round: `<circle cx="128" cy="128" r="76" fill="${primaryColor}" stroke="${stroke}" stroke-width="${highContrast ? 5 : 3}" />`,
    capsule: `<path d="M52 128a52 52 0 0 1 52-52h48a52 52 0 0 1 0 104h-48a52 52 0 0 1-52-52Z" fill="${primaryColor}" stroke="${stroke}" stroke-width="${highContrast ? 5 : 3}" /><path d="M128 77v102" stroke="${secondaryColor}" stroke-width="8" stroke-linecap="round" opacity="0.55" />`,
    triangle: `<path d="M128 48 214 194H42L128 48Z" fill="${primaryColor}" stroke="${stroke}" stroke-linejoin="round" stroke-width="${highContrast ? 5 : 3}" />`,
    oblong: `<rect x="42" y="78" width="172" height="100" rx="50" fill="${primaryColor}" stroke="${stroke}" stroke-width="${highContrast ? 5 : 3}" />`,
  }[shape];
  const dividerMarkup = divider === 'half'
    ? `<path d="M128 62v132" stroke="${dividerStroke}" stroke-width="${highContrast ? 7 : 5}" stroke-linecap="round" />`
    : divider === 'quarter'
      ? `<path d="M128 62v132" stroke="${dividerStroke}" stroke-width="${highContrast ? 7 : 5}" stroke-linecap="round" /><path d="M62 128h132" stroke="${dividerStroke}" stroke-width="${highContrast ? 7 : 5}" stroke-linecap="round" />`
      : '';

  return `${shapeMarkup}\n${dividerMarkup}\n${escapedImprint ? `<text x="128" y="138" text-anchor="middle" font-size="32" font-weight="700" fill="${dividerStroke}">${escapedImprint.slice(0, 6)}</text>` : ''}`;
}
