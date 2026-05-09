export interface Env {
  DB: D1Database;
  PILL_TEMPLATES_BUCKET: R2Bucket;
  ALLOWED_ORIGIN?: string;
  PILL_TEMPLATE_SUBMIT_TOKEN?: string;
}

type PillShape = "oblong" | "round" | "capsule" | "triangular";
type PillDivider = "none" | "half" | "quarter";

interface PillTemplateSubmission {
  ownerUserId: string;
  drugName: string;
  shape: PillShape;
  primaryColor: string;
  secondaryColor?: string;
  divider?: PillDivider;
  svgMarkup: string;
  isPublic?: boolean;
}

const MAX_SVG_SIZE_BYTES = 128_000;

function buildCorsHeaders(origin: string | null, allowedOrigin?: string): Record<string, string> {
  const isExplicitlyAllowed = Boolean(allowedOrigin && origin && origin === allowedOrigin);
  const allowOrigin = allowedOrigin ? (isExplicitlyAllowed ? allowedOrigin : "null") : "*";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    vary: "origin",
  };
}

function jsonResponse(status: number, payload: unknown, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function isValidHexColor(value: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
}

function hasUnsafeSvgContent(value: string): boolean {
  const bannedPatterns = [/<script\b/i, /<iframe\b/i, /<foreignObject\b/i, /<object\b/i, /<embed\b/i, /\son[a-z]+\s*=/i, /javascript:/i];
  return bannedPatterns.some((pattern) => pattern.test(value));
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function parseSubmission(input: unknown): PillTemplateSubmission | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;

  const parsed: PillTemplateSubmission = {
    ownerUserId: String(body.ownerUserId ?? "").trim(),
    drugName: String(body.drugName ?? "").trim(),
    shape: body.shape as PillShape,
    primaryColor: String(body.primaryColor ?? "").trim(),
    secondaryColor: typeof body.secondaryColor === "string" ? body.secondaryColor.trim() : undefined,
    divider: (body.divider as PillDivider) ?? "none",
    svgMarkup: String(body.svgMarkup ?? "").trim(),
    isPublic: typeof body.isPublic === "boolean" ? body.isPublic : true,
  };

  if (!parsed.ownerUserId || !parsed.drugName || !parsed.svgMarkup) return null;
  if (!["oblong", "round", "capsule", "triangular"].includes(parsed.shape)) return null;
  if (!["none", "half", "quarter"].includes(parsed.divider)) return null;
  if (!isValidHexColor(parsed.primaryColor)) return null;
  if (parsed.secondaryColor && !isValidHexColor(parsed.secondaryColor)) return null;
  if (parsed.svgMarkup.length > MAX_SVG_SIZE_BYTES) return null;
  if (!parsed.svgMarkup.startsWith("<svg")) return null;
  if (hasUnsafeSvgContent(parsed.svgMarkup)) return null;

  return parsed;
}

export default {
  async fetch(request, env): Promise<Response> {
    const origin = request.headers.get("origin");
    const corsHeaders = buildCorsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/api/pill-templates") {
      return jsonResponse(404, { error: "Not found" }, corsHeaders);
    }
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse(403, { error: "Origin not allowed" }, corsHeaders);
    }

    const expectedToken = env.PILL_TEMPLATE_SUBMIT_TOKEN?.trim();
    if (!expectedToken) {
      return jsonResponse(500, { error: "Missing server auth configuration" }, corsHeaders);
    }
    const providedToken = extractBearerToken(request.headers.get("authorization"));
    if (!providedToken || providedToken !== expectedToken) {
      return jsonResponse(401, { error: "Unauthorized" }, corsHeaders);
    }

    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" }, corsHeaders);
    }

    const submission = parseSubmission(parsedBody);
    if (!submission) {
      return jsonResponse(400, { error: "Invalid submission payload" }, corsHeaders);
    }

    const templateId = crypto.randomUUID();
    const r2Key = `pill-templates/${templateId}.svg`;
    const now = new Date().toISOString();

    await env.PILL_TEMPLATES_BUCKET.put(r2Key, submission.svgMarkup, {
      httpMetadata: { contentType: "image/svg+xml" },
      customMetadata: {
        drugName: submission.drugName,
        shape: submission.shape,
      },
    });

    await env.DB.prepare(
      `INSERT INTO pill_templates
      (id, owner_user_id, drug_name, shape, primary_color, secondary_color, divider, svg_r2_key, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        templateId,
        submission.ownerUserId,
        submission.drugName,
        submission.shape,
        submission.primaryColor,
        submission.secondaryColor ?? null,
        submission.divider,
        r2Key,
        submission.isPublic ? 1 : 0,
        now,
        now,
      )
      .run();

    return jsonResponse(
      201,
      {
        id: templateId,
        drugName: submission.drugName,
        shape: submission.shape,
        divider: submission.divider,
        primaryColor: submission.primaryColor,
        secondaryColor: submission.secondaryColor ?? null,
        svgR2Key: r2Key,
        createdAt: now,
      },
      corsHeaders,
    );
  },
} satisfies ExportedHandler<Env>;
