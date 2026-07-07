import { NextResponse } from "next/server";
import { generate, AnthropicError } from "@/lib/anthropic";
import { SCAN_SYSTEM, SCAN_USER } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let mode: string = "fast";
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.mode === "string") mode = body.mode;
  } catch {
    // lege body is prima
  }

  const useWebSearch = mode === "fresh";

  try {
    const data = await generate(
      {
        system: SCAN_SYSTEM,
        userText: SCAN_USER,
        useWebSearch,
        maxTokens: 4096,
      },
      "scan"
    );
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof AnthropicError
        ? err.message
        : "Er ging iets mis bij de marktscan. Probeer het opnieuw.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
