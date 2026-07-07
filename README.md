# Groeikansen

Een persoonlijke web-app die met een AI-analist (de Anthropic Messages API) hoog-potentiële groeiaandelen voor je vindt. De UI is volledig in het Nederlands en de app is installeerbaar op je telefoon als icoon ("Zet op beginscherm").

**Belangrijk:** dit is research-software, **geen financieel advies**. De inzichten worden live door AI gegenereerd, kunnen fouten bevatten en geven geen garanties of koersvoorspellingen. Controleer cijfers altijd zelf en beleg nooit met geld dat je niet kunt missen.

## Hoe het werkt (veilig)

- De **frontend** (wat je in de browser/op je telefoon ziet) roept alleen je eigen endpoints aan: `POST /api/scan` en `POST /api/stock`.
- De **backend** (Next.js, draait op de server) bewaart je `ANTHROPIC_API_KEY` in een environment-variabele en praat namens jou met Anthropic.
- Je geheime sleutel komt dus **nooit** in de frontend of de browser terecht.

Twee modi (tabs):

- **Marktscan** — één knop laat een agressieve groei-analist 5 gerangschikte kansen vinden (kleine/middelgrote namen, horizon max 12 maanden, bull-scenario ≥ +25%).
- **Aandeel checken** — typ een ticker of bedrijfsnaam en krijg een evenwichtige doorlichting (bull én bear, koop-tips, geen stellig bevel).

En een globale snelheidsschakelaar:

- **⚡ Snel** (standaard) — uit de kennis van het model, een paar seconden.
- **🌐 Vers van het web** — mét web search, actueler maar trager.

## Installeren en lokaal draaien

Je hebt [Node.js](https://nodejs.org) versie 18.18 of hoger nodig (Node 20 of 22 is prima).

```bash
# 1. Dependencies installeren
npm install

# 2. Je sleutel instellen: kopieer het voorbeeldbestand...
cp .env.example .env.local
# ...en open .env.local, plak je sleutel achter ANTHROPIC_API_KEY=

# 3. App starten
npm run dev
```

Open daarna **http://localhost:3000** in je browser.

> Je Anthropic API-sleutel haal je op via de [Anthropic Console](https://console.anthropic.com/) → *API Keys*. Hij begint met `sk-ant-`.

### Environment-variabelen

| Variabele           | Verplicht | Uitleg                                                                 |
| ------------------- | --------- | --------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Ja        | Je geheime sleutel. Blijft op de server.                              |
| `ANTHROPIC_MODEL`   | Nee       | Welk model wordt gebruikt. Standaard een actueel Sonnet-model.        |

De icons worden meegeleverd. Wil je ze opnieuw genereren? `npm run icons`.

## Op je telefoon zetten (PWA)

1. Deploy de app (zie hieronder) of open hem op je telefoon via het lokale netwerk-adres.
2. **iPhone (Safari):** deel-knop → *Zet op beginscherm*.
3. **Android (Chrome):** menu → *App installeren* / *Toevoegen aan startscherm*.

De app verschijnt dan als icoon en opent schermvullend, net als een echte app.

> Tip: op iPhone werkt "Zet op beginscherm" het best op een echte `https://`-URL (dus na deployen naar Vercel), niet op `localhost`.

## Deployen naar Vercel (voorbeeld)

1. Zet deze map in een Git-repository (GitHub/GitLab).
2. Ga naar [vercel.com](https://vercel.com), klik **Add New → Project** en importeer de repo.
3. Bij **Environment Variables** voeg je toe:
   - `ANTHROPIC_API_KEY` = jouw sleutel
   - (optioneel) `ANTHROPIC_MODEL`
4. Klik **Deploy**. Vercel herkent Next.js automatisch.

Na het deployen krijg je een `https://…vercel.app`-adres. Open dat op je telefoon en zet het op je beginscherm.

> De sleutel staat als environment-variabele bij Vercel en wordt nooit naar de browser gestuurd.

## Projectstructuur

```
app/
  layout.tsx          metadata, PWA-manifest, thema
  page.tsx            de hele UI: 2 tabs + snelheidsschakelaar
  globals.css         donkere "dossier"-look
  api/scan/route.ts   proxy voor de marktscan
  api/stock/route.ts  proxy voor het doorlichten van één aandeel
lib/
  anthropic.ts        API-call, JSON-parser, bergingsparser, retry, 90s-timeout
  prompts.ts          de instructies voor de AI (Nederlands)
public/
  manifest.webmanifest, sw.js, icons
scripts/make-icons.mjs  genereert de icons
```

## Verantwoorde kaders

De app toont bovenaan de scanresultaten een risico-banner, zet bij elk idee het neerwaartse scenario expliciet naast het opwaartse, en geeft geen garanties. Onderaan staat een disclaimer: dit is research, geen financieel advies — raadpleeg bij echte beslissingen een gediplomeerd adviseur.
