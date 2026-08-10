# Benefits Form Automation — Architecture Summary

## What This Tool Does

Given one or more dental insurance benefits breakdown PDFs (from the Stratus verification platform), this tool automatically extracts 60+ data fields and overlays them onto a standardized internal benefits form — producing a completed, consistently formatted output image. A Full breakdown is primary; an optional Basic breakdown is used for confirmation and fallback.

---

## Addressing the Reliability Question

A common concern with AI-powered document tools is that the AI controls the final output — meaning errors or variability in the model directly corrupt the result. This system is architected specifically to avoid that problem.

**The AI never touches the rendering. It only produces data.**

---

## Two Completely Separate Stages

### Stage 1 — Extraction (AI / OpenAI Responses API)
The AI reads the input PDF and outputs a structured JSON object containing every required field value:
```json
{ "effective_date": "01-JAN-26", "max": "$2,000", "cob": "Standard", ... }
```
This is where AI variability lives — but it is tightly controlled through a strict output schema, REV22 normalization rules, and a review-required gate for unresolved conflicts.

### Stage 2 — Rendering (Deterministic Code)
The JSON from Stage 1 is passed to standard image-processing code — no AI involved. Each field is placed at a hardcoded pixel coordinate on the blank form template. Given identical JSON input, this stage produces an identical image every single time.

---

## How AI Extraction Variability Is Suppressed

| Risk | Mitigation |
|---|---|
| AI changes structure of response | JSON schema enforced output — the AI cannot deviate from the required shape |
| AI hallucinates a value | Temperature set to 0 — fully deterministic sampling, no creativity |
| AI skips a field | Schema requires every field present; missing values output an explicit `MISSING` token |
| AI misreads a table value | Validation checks key formats before rendering; malformed values and unresolved Full/Basic conflicts are blocked for review |
| Inconsistency across runs | Same system prompt + same schema + temperature 0 = same output for same input |

---

## Technology Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend / Hosting | Next.js on Vercel | Simple upload UI; no infrastructure to manage |
| AI Extraction | OpenAI Responses API | Native PDF input; strict structured JSON output |
| Image Rendering | Sharp + SVG (Node.js) | Pixel-precise text and shape placement; no dependency issues on Vercel |
| Font | DejaVuSans (bundled) | Matches form spec exactly; no install required |

---

## Summary

The AI acts as a structured data extractor with a fixed schema — not a creative generator. It reads real values from a consistent document format and returns them in a validated, typed JSON envelope. The rendering step is entirely deterministic code with hardcoded coordinates. The same PDF in always produces the same completed form out, with any extraction anomalies caught and flagged before an image is ever generated.
