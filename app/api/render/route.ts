import { NextRequest, NextResponse } from "next/server"
import * as path from "path"
import { passcodesMatch } from "@/lib/auth"
import { FIELD_KEYS, type ExtractedFields } from "@/lib/extract"
import { outputFilename, renderForm, type HeaderAnnotations } from "@/lib/render"

export const maxDuration = 30

function validFields(value: unknown): value is ExtractedFields {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return FIELD_KEYS.every((key) =>
    typeof record[key] === "string" && (record[key] as string).length <= 2_000
  )
}

function validAnnotations(value: unknown): value is HeaderAnnotations {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  const primaryStatuses = new Set(["primary", "secondary", "none"])
  const carriers = new Set(["delta", "dpo_cap", "metlife", "guardian", "none"])
  const flags = new Set(["oon_auth", "ok_for_hyg", "col_pct", "col_ded", "col_dpo_cap", "col_hyg", "col_full_ucr"])
  return typeof record.primaryStatus === "string" && primaryStatuses.has(record.primaryStatus) &&
    typeof record.carrier === "string" && carriers.has(record.carrier) &&
    Array.isArray(record.flags) && record.flags.every((flag) => typeof flag === "string" && flags.has(flag))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { passcode?: unknown; fields?: unknown; annotations?: unknown }
    const expectedPasscode = process.env.BENEFITS_PASSCODE

    if (!expectedPasscode) {
      return NextResponse.json(
        { error: "Processing is unavailable because the server passcode is not configured." },
        { status: 503 }
      )
    }

    if (typeof body.passcode !== "string" || !passcodesMatch(body.passcode, expectedPasscode)) {
      return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 })
    }

    if (!validFields(body.fields)) {
      return NextResponse.json({ error: "The resolved form data is invalid." }, { status: 400 })
    }

    if (!validAnnotations(body.annotations)) {
      return NextResponse.json({ error: "The header box selections are invalid." }, { status: 400 })
    }

    const templatePath = path.join(process.cwd(), "public", "template.jpg")
    const imageBuffer = await renderForm(templatePath, body.fields, body.annotations)
    const filename = outputFilename(body.fields)

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
