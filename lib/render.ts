import sharp from "sharp"
import * as fs from "fs"
import * as path from "path"
import { FIELDS, CIRCLES, COB_ALERT } from "./fields"
import type { ExtractedFields } from "./extract"

const FONT_SIZE = 18
const BOX_HEIGHT = 32
const RED = "rgb(220,0,0)"
const BLACK = "rgb(0,0,0)"
const WHITE = "rgb(255,255,255)"
const CIRCLE_RADIUS = 22
const CIRCLE_THICKNESS = 3

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function fontBase64(): string {
  const fontPath = path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf")
  return fs.readFileSync(fontPath).toString("base64")
}

function boldFontBase64(): string {
  const fontPath = path.join(process.cwd(), "public", "fonts", "DejaVuSans-Bold.ttf")
  return fs.readFileSync(fontPath).toString("base64")
}

interface SvgElement {
  svg: string
}

function whiteRect(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${WHITE}"/>`
}

function redOutlineRect(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="none" stroke="${RED}" stroke-width="2"/>`
}

function textElement(
  x: number,
  y: number,
  text: string,
  color: string = BLACK,
  bold: boolean = false
): string {
  const fontFamily = bold ? "DejaVuSansBold" : "DejaVuSans"
  return `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${FONT_SIZE}" fill="${color}" dominant-baseline="auto">${escapeXml(text)}</text>`
}

function circle(cx: number, cy: number): string {
  return `<circle cx="${cx}" cy="${cy}" r="${CIRCLE_RADIUS}" fill="none" stroke="${BLACK}" stroke-width="${CIRCLE_THICKNESS}"/>`
}

export async function renderForm(
  templatePath: string,
  fields: ExtractedFields
): Promise<Buffer> {
  const templateBuffer = fs.readFileSync(templatePath)
  const meta = await sharp(templateBuffer).metadata()
  const W = meta.width ?? 1224
  const H = meta.height ?? 1584

  const fontB64 = fontBase64()
  const boldFontB64 = boldFontBase64()

  const elements: string[] = []

  // --- Render standard fields ---
  for (const field of FIELDS) {
    const value: string = (fields as unknown as Record<string, string>)[field.key] ?? "MISSING"
    const boxW = field.x2 - field.x
    const boxH = field.boxHeight ?? BOX_HEIGHT

    if (field.topDown) {
      // Sealants: top-down multiline starting at (x, y)
      const lines = value.split("\n").filter(Boolean)
      const startY = field.y + FONT_SIZE
      elements.push(whiteRect(field.x, field.y + boxH * lines.length + 4, boxW, boxH * lines.length + 8))
      lines.forEach((line, i) => {
        elements.push(textElement(field.x, startY + i * (FONT_SIZE + 2), line))
      })
      continue
    }

    if (value === "MISSING") {
      elements.push(redOutlineRect(field.x, field.y, boxW, boxH))
      elements.push(textElement(field.x + 2, field.y - 8, "Missing", RED))
    } else {
      elements.push(whiteRect(field.x, field.y, boxW, boxH))
      elements.push(textElement(field.x, field.y - 2, value))
    }
  }

  // --- COB Alert ---
  const cob = fields.cob
  if (cob && cob !== "MISSING") {
    const alertText =
      cob === "Standard"
        ? null
        : cob.trim() === "" || cob === "REVIEW"
        ? "COB-UNKNOWN"
        : "NON DUPLICATION OF BENEFITS!!!"

    if (alertText) {
      const aw = COB_ALERT.x2 - COB_ALERT.x
      elements.push(textElement(COB_ALERT.x, COB_ALERT.y, alertText, RED, true))
    }
  }

  // --- Night Guard circle ---
  if (fields.ng_circle === "YES") {
    elements.push(circle(CIRCLES.ng_yes.cx, CIRCLES.ng_yes.cy))
  } else if (fields.ng_circle === "NO") {
    elements.push(circle(CIRCLES.ng_no.cx, CIRCLES.ng_no.cy))
  }

  // --- Posterior Comp downgrade circle ---
  if (fields.post_comp_circle === "YES") {
    elements.push(circle(CIRCLES.post_comp_yes.cx, CIRCLES.post_comp_yes.cy))
  } else if (fields.post_comp_circle === "NO") {
    elements.push(circle(CIRCLES.post_comp_no.cx, CIRCLES.post_comp_no.cy))
  }

  // --- Build SVG ---
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>
      @font-face {
        font-family: 'DejaVuSans';
        src: url('data:font/truetype;base64,${fontB64}');
      }
      @font-face {
        font-family: 'DejaVuSansBold';
        src: url('data:font/truetype;base64,${boldFontB64}');
      }
    </style>
  </defs>
  ${elements.join("\n  ")}
</svg>`

  const svgBuffer = Buffer.from(svg)

  const output = await sharp(templateBuffer)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toBuffer()

  return output
}

export function outputFilename(fields: ExtractedFields): string {
  const date = new Date().toISOString().split("T")[0]
  const parts = [
    fields.patient_name,
    fields.group_number,
    date,
  ]
  return (
    parts
      .join(" ")
      .replace(/[/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim() + ".jpg"
  )
}
