import { NextResponse } from "next/server";
import { generate, AnthropicError } from "@/lib/anthropic";
import { NEWS_SYSTEM, NEWS_USER } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

// Let op: WSJ, NYT, FT, Barron's en The Economist blokkeren Anthropic's
// web-search-crawler (paywall/bot-bescherming), dus een harde allowed_domains-
// restrictie op die sites geeft een 400-fout ("not accessible to our user
// agent"). We doen daarom een gewone web search en dwingen via de system
// prompt af dat elk item alleen wordt gebruikt als het aan één van deze
// bronnen kan worden toegeschreven (titel/snippet/citaat uit het zoekresultaat
// is voldoende, een volledige paginafetch is niet nodig).
export async function POST() {
  try {
    const data = await generate(
      {
        system: NEWS_SYSTEM,
        userText: NEWS_USER,
        useWebSearch: true, // nieuws heeft altijd actuele web search nodig
        maxTokens: 4096,
        maxSearches: 8,
        timeoutMs: 110_000,
      },
      "news"
    );
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof AnthropicError
        ? err.message
        : "Er ging iets mis bij het ophalen van het nieuws. Probeer het opnieuw.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
