import { NextRequest, NextResponse } from "next/server"
import * as path from "path"
import { extractFields } from "@/lib/extract"
import { renderForm, outputFilename } from "@/lib/render"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("pdf") as File | null

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 })
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer())

    // Stage 1: extract fields via Claude
    const fields = await extractFields(pdfBuffer)

    // Stage 2: render onto template
    const templatePath = path.join(process.cwd(), "public", "template.jpg")
    const imageBuffer = await renderForm(templatePath, fields)

    const filename = outputFilename(fields)

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
