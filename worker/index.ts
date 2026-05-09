import type { PillDivider, PillShape, PillTemplatePayload } from '../src/types/pill';

interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
}

const SHAPES = new Set<PillShape>(['oblong', 'round', 'capsule', 'triangle']);
const DIVIDERS = new Set<PillDivider>(['none', 'half', 'quarter']);
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function jsonResponse(body: unknown, init: ResponseInit = {}, origin = '*') {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      ...init.headers,
    },
  });
}

function normalizeDrugName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function assertPillTemplate(value: Partial<PillTemplatePayload>): asserts value is PillTemplatePayload {
  if (!value.drugName || value.drugName.trim().length < 2 || value.drugName.length > 160) {
    throw new Error('Drug name must be 2-160 characters.');
  }

  if (!value.dosageLabel || value.dosageLabel.trim().length < 1 || value.dosageLabel.length > 80) {
    throw new Error('Dosage is required and must be 1-80 characters.');
  }

  const pillsPerBox = value.pillsPerBox;
  if (!Number.isInteger(pillsPerBox) || pillsPerBox === undefined || pillsPerBox < 1 || pillsPerBox > 1000) {
    throw new Error('Pills per box must be a whole number from 1-1000.');
  }

  if (!value.shape || !SHAPES.has(value.shape)) {
    throw new Error('Unsupported pill shape.');
  }

  if (!value.divider || !DIVIDERS.has(value.divider)) {
    throw new Error('Unsupported divider.');
  }

  if (!value.primaryColor || !HEX_COLOR.test(value.primaryColor)) {
    throw new Error('Primary color must be a 6-digit hex color.');
  }

  if (value.secondaryColor && !HEX_COLOR.test(value.secondaryColor)) {
    throw new Error('Secondary color must be a 6-digit hex color.');
  }

  const svg = value.svg?.trim() ?? '';
  if (!svg || !svg.startsWith('<svg') && !svg.startsWith('<?xml')) {
    throw new Error('SVG payload is required.');
  }

  if (new TextEncoder().encode(svg).byteLength > 64_000) {
    throw new Error('SVG template exceeds 64 KB.');
  }
}

async function createPillTemplate(request: Request, env: Env, origin: string) {
  const payload = (await request.json()) as Partial<PillTemplatePayload>;
  assertPillTemplate(payload);

  const id = crypto.randomUUID();
  const normalizedDrugName = normalizeDrugName(payload.drugName);

  await env.DB.prepare(
    `INSERT INTO pill_templates (
      id, drug_name, normalized_drug_name, dosage_label, pills_per_box, shape,
      primary_color, secondary_color, divider, imprint, svg_text, is_public
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  )
    .bind(
      id,
      payload.drugName.trim(),
      normalizedDrugName,
      payload.dosageLabel.trim(),
      payload.pillsPerBox,
      payload.shape,
      payload.primaryColor,
      payload.secondaryColor ?? null,
      payload.divider,
      payload.imprint?.trim() ?? null,
      payload.svg.trim(),
    )
    .run();

  return jsonResponse({ id }, { status: 201 }, origin);
}

async function searchPillTemplates(request: Request, env: Env, origin: string) {
  const url = new URL(request.url);
  const query = normalizeDrugName(url.searchParams.get('q') ?? '');
  const likeQuery = `%${query}%`;

  const result = await env.DB.prepare(
    `SELECT id, drug_name, dosage_label, pills_per_box, shape, primary_color,
      secondary_color, divider, imprint, svg_text, created_at
     FROM pill_templates
     WHERE is_public = 1 AND (? = '' OR normalized_drug_name LIKE ?)
     ORDER BY created_at DESC
     LIMIT 25`,
  )
    .bind(query, likeQuery)
    .all();

  return jsonResponse({ templates: result.results ?? [] }, { status: 200 }, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? '*';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return jsonResponse({ ok: true }, { status: 204 }, origin);
    }

    if (url.pathname !== '/api/pill-templates') {
      return jsonResponse({ error: 'Not found' }, { status: 404 }, origin);
    }

    try {
      if (request.method === 'POST') {
        return await createPillTemplate(request, env, origin);
      }

      if (request.method === 'GET') {
        return await searchPillTemplates(request, env, origin);
      }

      return jsonResponse({ error: 'Method not allowed' }, { status: 405 }, origin);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 }, origin);
    }
  },
};
