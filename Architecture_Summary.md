# Benefits Form Automation — Architecture Summary

## What This Tool Does

Given a dental insurance benefits breakdown PDF (from the Stratus verification platform), this tool automatically extracts 45+ data fields and overlays them onto a standardized internal benefits form — producing a completed, consistently formatted output image. The process takes seconds and requires no manual data entry.

---

## Addressing the Reliability Question

A common concern with AI-powered document tools is that the AI controls the final output — meaning errors or variability in the model directly corrupt the result. This system is architected specifically to avoid that problem.

**The AI never touches the rendering. It only produces data.**

---

## Two Completely Separate Stages

### Stage 1 — Extraction (AI / Claude API)
The AI reads the input PDF and outputs a structured JSON object containing every required field value:
```json
{ "effective_date": "01-JAN-26", "max": "$2,000", "cob": "Standard", ... }
```
This is where AI variability lives — but it is tightly controlled (see mitigations below).

### Stage 2 — Rendering (Deterministic Code)
The JSON from Stage 1 is passed to standard image-processing code — no AI involved. Each field is placed at a hardcoded pixel coordinate on the blank form template. Given identical JSON input, this stage produces an identical image every single time.

---

## How AI Extraction Variability Is Suppressed

| Risk | Mitigation |
|---|---|
| AI changes structure of response | JSON schema enforced output — the AI cannot deviate from the required shape |
| AI hallucinates a value | Temperature set to 0 — fully deterministic sampling, no creativity |
| AI skips a field | Schema requires every field present; missing values output an explicit `MISSING` token |
| AI misreads a table value | Validation layer checks formats (e.g. `DD-MMM-YY`, `$X,XXX`, `XX%`) before rendering — malformed values are flagged and blocked |
| Inconsistency across runs | Same system prompt + same schema + temperature 0 = same output for same input |

---

## Technology Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend / Hosting | Next.js on Vercel | Simple upload UI; no infrastructure to manage |
| AI Extraction | Anthropic Claude API | Native PDF input; structured JSON output mode |
| Image Rendering | Sharp + SVG (Node.js) | Pixel-precise text and shape placement; no dependency issues on Vercel |
| Font | DejaVuSans (bundled) | Matches form spec exactly; no install required |

---

## Summary

The AI acts as a structured data extractor with a fixed schema — not a creative generator. It reads real values from a consistent document format and returns them in a validated, typed JSON envelope. The rendering step is entirely deterministic code with hardcoded coordinates. The same PDF in always produces the same completed form out, with any extraction anomalies caught and flagged before an image is ever generated.
