import { NextResponse } from "next/server";
import { generate, AnthropicError } from "@/lib/anthropic";
import { STOCK_SYSTEM, stockUser } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let query = "";
  let mode = "fast";
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.query === "string") query = body.query.trim();
    if (body && typeof body.mode === "string") mode = body.mode;
  } catch {
    // valt hieronder door de validatie
  }

  if (!query) {
    return NextResponse.json(
      { error: "Vul een ticker of bedrijfsnaam in." },
      { status: 400 }
    );
  }

  const useWebSearch = mode === "fresh";

  try {
    const data = await generate(
      {
        system: STOCK_SYSTEM,
        userText: stockUser(query),
        useWebSearch,
        maxTokens: 4096,
      },
      "stock"
    );
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof AnthropicError
        ? err.message
        : "Er ging iets mis bij het doorlichten van dit aandeel. Probeer het opnieuw.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
