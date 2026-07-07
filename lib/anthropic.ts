// Server-only helper. Praat met de Anthropic Messages API.
// De API-sleutel wordt hier uit een environment-variabele gelezen en
// verlaat de server nooit richting de browser.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const TIMEOUT_MS = 90_000;

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: string; [key: string]: unknown };

interface AnthropicResponse {
  content?: AnthropicBlock[];
  stop_reason?: string;
  [key: string]: unknown;
}

interface CallOptions {
  system: string;
  userText: string;
  useWebSearch: boolean;
  maxTokens?: number;
  maxSearches?: number;
  timeoutMs?: number;
  allowedDomains?: string[];
}

export class AnthropicError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AnthropicError";
    this.status = status;
  }
}

// Eén ruwe call naar de API met een harde timeout (standaard ~90s).
async function rawCall(opts: CallOptions): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AnthropicError(
      "Geen ANTHROPIC_API_KEY ingesteld op de server. Zet deze in .env.local."
    );
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.userText }],
  };

  if (opts.useWebSearch) {
    const tool: Record<string, unknown> = {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: opts.maxSearches ?? 2,
    };
    if (opts.allowedDomains && opts.allowedDomains.length > 0) {
      tool.allowed_domains = opts.allowedDomains;
    }
    body.tools = [tool];
  }

  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AnthropicError(
        `De analyse duurde te lang (langer dan ${Math.round(
          timeoutMs / 1000
        )} seconden) en is afgebroken. Probeer het opnieuw, eventueel in de modus 'Snel'.`
      );
    }
    throw new AnthropicError("Kon de AI-dienst niet bereiken. Controleer je internetverbinding.");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AnthropicError(
      `De AI-dienst gaf een fout (${res.status}). ${detail.slice(0, 300)}`,
      res.status
    );
  }

  return (await res.json()) as AnthropicResponse;
}

// Plak alle text-blocks aan elkaar; negeer tool-/zoekresultaatblokken.
function extractText(resp: AnthropicResponse): string {
  const blocks = Array.isArray(resp.content) ? resp.content : [];
  return blocks
    .filter((b): b is { type: "text"; text: string } => b.type === "text" && typeof (b as { text?: unknown }).text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Verwijder ```json ... ``` of ``` ... ``` markdown-fences.
function stripFences(text: string): string {
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const m = t.match(fence);
  if (m) t = m[1].trim();
  // Soms staat er nog losse tekst voor de eerste { ; knip daar naartoe.
  const firstBrace = t.indexOf("{");
  if (firstBrace > 0) t = t.slice(firstBrace);
  return t.trim();
}

// Redt complete top-level objecten uit een (mogelijk afgekapte) array bij `key`.
function extractObjectsFromArray(text: string, key: string): unknown[] {
  const keyIdx = text.indexOf(`"${key}"`);
  if (keyIdx === -1) return [];

  const arrStart = text.indexOf("[", keyIdx);
  if (arrStart === -1) return [];

  const objects: unknown[] = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = arrStart + 1; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const chunk = text.slice(objStart, i + 1);
        try {
          objects.push(JSON.parse(chunk));
        } catch {
          // negeer onleesbaar object
        }
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      break; // einde van de array
    }
  }

  return objects;
}

// Best-effort: redt één string-veld uit ruwe tekst.
function grabString(text: string, key: string): string {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  if (!m) return "";
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return m[1];
  }
}

// Best-effort: redt een getal-veld uit ruwe tekst.
function grabNumber(text: string, key: string): number | undefined {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : undefined;
}

// Best-effort: redt een string-array-veld (sluit een afgekapte array zo nodig zelf af).
function grabStringArray(text: string, key: string): string[] {
  const keyIdx = text.indexOf(`"${key}"`);
  if (keyIdx === -1) return [];
  const arrStart = text.indexOf("[", keyIdx);
  if (arrStart === -1) return [];
  const arrEnd = text.indexOf("]", arrStart);
  const slice =
    arrEnd !== -1 ? text.slice(arrStart, arrEnd + 1) : text.slice(arrStart) + '"]';
  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Bergingsparser: redt complete opportunities uit een afgekapte scan-array.
function salvageOpportunities(text: string): unknown | null {
  const objects = extractObjectsFromArray(text, "opportunities");
  if (objects.length === 0) return null;
  return {
    market_note: grabString(text, "market_note"),
    opportunities: objects,
    _salvaged: true,
  };
}

// Bergingsparser: redt complete picks uit een afgekapte portfolio-analyse.
function salvagePicks(text: string): unknown | null {
  const objects = extractObjectsFromArray(text, "picks");
  if (objects.length === 0) return null;
  return {
    profile_summary: grabString(text, "profile_summary"),
    themes: grabStringArray(text, "themes"),
    picks: objects,
    cash_reserve_pct: grabNumber(text, "cash_reserve_pct"),
    portfolio_risk: grabString(text, "portfolio_risk"),
    watchlist: grabStringArray(text, "watchlist"),
    _salvaged: true,
  };
}

// Bergingsparser: redt complete nieuwsitems uit een afgekapt nieuwsoverzicht.
function salvageNews(text: string): unknown | null {
  const objects = extractObjectsFromArray(text, "items");
  if (objects.length === 0) return null;
  return {
    scanned_at: grabString(text, "scanned_at"),
    items: objects,
    _salvaged: true,
  };
}

// Redt het eerste volledige top-level JSON-object uit een (mogelijk afgekapte) tekst.
function salvageObject(text: string): unknown | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export type Mode = "scan" | "stock" | "portfolio" | "news";

function parseModelJson(text: string, mode: Mode): unknown {
  const cleaned = stripFences(text);

  // 1) Gewoon proberen.
  try {
    return JSON.parse(cleaned);
  } catch {
    // ga door naar berging
  }

  // 2) Bergingspoging.
  if (mode === "scan") {
    const salvaged = salvageOpportunities(cleaned);
    if (salvaged) return salvaged;
  }
  if (mode === "portfolio") {
    const salvaged = salvagePicks(cleaned);
    if (salvaged) return salvaged;
  }
  if (mode === "news") {
    const salvaged = salvageNews(cleaned);
    if (salvaged) return salvaged;
  }
  const obj = salvageObject(cleaned);
  if (obj) return obj;

  throw new AnthropicError("Kon het antwoord van de AI niet als geldige JSON lezen.");
}

// Voer een call uit en parse; bij mislukking precies één automatische herkansing.
export async function generate(opts: CallOptions, mode: Mode): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await rawCall(opts);
      const text = extractText(resp);
      if (!text) throw new AnthropicError("De AI gaf een leeg antwoord terug.");
      return parseModelJson(text, mode);
    } catch (err) {
      lastErr = err;
      // Bij een echte API-fout (bv. ongeldige sleutel) heeft herkansen geen zin.
      if (err instanceof AnthropicError && err.status && err.status >= 400 && err.status < 500) {
        break;
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new AnthropicError("Onbekende fout bij het uitvoeren van de analyse.");
}
