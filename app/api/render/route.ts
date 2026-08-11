import { NextRequest, NextResponse } from "next/server"
import * as path from "path"
import { passcodesMatch } from "@/lib/auth"
import { FIELD_KEYS, type ExtractedFields } from "@/lib/extract"
import { outputFilename, renderForm } from "@/lib/render"

export const maxDuration = 30

function validFields(value: unknown): value is ExtractedFields {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return FIELD_KEYS.every((key) =>
    typeof record[key] === "string" && (record[key] as string).length <= 2_000
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { passcode?: unknown; fields?: unknown }
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

    const templatePath = path.join(process.cwd(), "public", "template.jpg")
    const imageBuffer = await renderForm(templatePath, body.fields)
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
