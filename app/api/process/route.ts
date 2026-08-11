import { NextRequest, NextResponse } from "next/server"
import * as path from "path"
import { extractFields, ReviewRequiredError } from "@/lib/extract"
import { renderForm, outputFilename } from "@/lib/render"
import { passcodesMatch } from "@/lib/auth"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const expectedPasscode = process.env.BENEFITS_PASSCODE
    const providedPasscode = formData.get("passcode")

    if (!expectedPasscode) {
      return NextResponse.json(
        { error: "Processing is unavailable because the server passcode is not configured." },
        { status: 503 }
      )
    }

    if (typeof providedPasscode !== "string" || !passcodesMatch(providedPasscode, expectedPasscode)) {
      return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 })
    }

    const fullFile = formData.get("full_pdf")
    const basicFile = formData.get("basic_pdf")

    if (!(fullFile instanceof File) || fullFile.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload the required Full Breakdown PDF." }, { status: 400 })
    }

    if (basicFile !== null && (!(basicFile instanceof File) || basicFile.type !== "application/pdf")) {
      return NextResponse.json({ error: "The Basic Breakdown must be a PDF file." }, { status: 400 })
    }

    const pdfs: Parameters<typeof extractFields>[0] = [
      {
        role: "full",
        filename: fullFile.name,
        buffer: Buffer.from(await fullFile.arrayBuffer()),
      },
    ]

    if (basicFile instanceof File) {
      pdfs.push({
        role: "basic",
        filename: basicFile.name,
        buffer: Buffer.from(await basicFile.arrayBuffer()),
      })
    }

    // Stage 1: extract fields via OpenAI
    const { fields, cost, conflicts, reviewReasons } = await extractFields(pdfs)

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          reviewRequired: true,
          fields,
          conflicts,
          reviewReasons,
          costUsd: cost?.usd ?? null,
        },
        { status: 409 }
      )
    }

    // Stage 2: render onto template
    const templatePath = path.join(process.cwd(), "public", "template.jpg")
    const imageBuffer = await renderForm(templatePath, fields)

    const filename = outputFilename(fields)

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        ...(cost ? {
          "X-OpenAI-Cost-USD": cost.usd.toFixed(6),
          "X-OpenAI-Input-Tokens": String(cost.inputTokens),
          "X-OpenAI-Output-Tokens": String(cost.outputTokens),
          "X-OpenAI-Model": cost.model,
        } : {}),
      },
    })
  } catch (err) {
    console.error(err)
    if (err instanceof ReviewRequiredError) {
      return NextResponse.json(
        {
          error: "Review required before rendering.",
          reasons: err.reasons,
          costUsd: err.cost?.usd ?? null,
        },
        { status: 422 }
      )
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
