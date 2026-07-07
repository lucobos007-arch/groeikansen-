import { NextResponse } from "next/server";
import { generate, AnthropicError } from "@/lib/anthropic";
import { PORTFOLIO_SYSTEM, portfolioUser, type PortfolioProfile } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  let mode = "fast";
  let rawProfile: Record<string, unknown> = {};
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.mode === "string") mode = body.mode;
    if (body && typeof body.profile === "object" && body.profile) {
      rawProfile = body.profile as Record<string, unknown>;
    }
  } catch {
    // lege body is prima, we vallen terug op defaults
  }

  const profile: PortfolioProfile = {
    risk: typeof rawProfile.risk === "string" && rawProfile.risk ? rawProfile.risk : "Gemiddeld",
    amount:
      typeof rawProfile.amount === "number" && rawProfile.amount > 0
        ? rawProfile.amount
        : 10000,
    horizon:
      typeof rawProfile.horizon === "string" && rawProfile.horizon
        ? rawProfile.horizon
        : "3-5 jaar",
    sectors: typeof rawProfile.sectors === "string" ? rawProfile.sectors : "",
    region:
      typeof rawProfile.region === "string" && rawProfile.region
        ? rawProfile.region
        : "Wereldwijd",
    goal: typeof rawProfile.goal === "string" && rawProfile.goal ? rawProfile.goal : "Mix",
  };

  const useWebSearch = mode === "fresh";

  try {
    const data = await generate(
      {
        system: PORTFOLIO_SYSTEM,
        userText: portfolioUser(profile),
        useWebSearch,
        maxTokens: 8000,
        maxSearches: 8,
        timeoutMs: useWebSearch ? 170_000 : 90_000,
      },
      "portfolio"
    );
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof AnthropicError
        ? err.message
        : "Er ging iets mis bij de portfolio-analyse. Probeer het opnieuw.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
