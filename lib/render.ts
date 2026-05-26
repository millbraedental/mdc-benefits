import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas"
import * as fs from "fs"
import * as path from "path"
import { FIELDS, CIRCLES, COB_ALERT } from "./fields"
import type { ExtractedFields } from "./extract"

const FONT_SIZE = 18
const BOX_HEIGHT = 32
const CIRCLE_RADIUS = 22
const CIRCLE_THICKNESS = 3

function registerFonts() {
  const fontsDir = path.join(process.cwd(), "public", "fonts")
  GlobalFonts.registerFromPath(path.join(fontsDir, "DejaVuSans.ttf"), "DejaVuSans")
  GlobalFonts.registerFromPath(path.join(fontsDir, "DejaVuSans-Bold.ttf"), "DejaVuSansBold")
}

export async function renderForm(
  templatePath: string,
  fields: ExtractedFields
): Promise<Buffer> {
  registerFonts()

  const templateBuffer = fs.readFileSync(templatePath)
  const templateImage = await loadImage(templateBuffer)
  const W = templateImage.width
  const H = templateImage.height

  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")

  // Draw template
  ctx.drawImage(templateImage, 0, 0)

  // --- Render standard fields ---
  for (const field of FIELDS) {
    const value: string = (fields as unknown as Record<string, string>)[field.key] ?? "MISSING"
    const boxW = field.x2 - field.x
    const boxH = field.boxHeight ?? BOX_HEIGHT

    if (field.topDown) {
      // Sealants: top-down multiline
      const lines = value.split("\n").filter(Boolean)
      ctx.fillStyle = "white"
      ctx.fillRect(field.x, field.y, boxW, lines.length * (FONT_SIZE + 4) + 4)
      ctx.fillStyle = "black"
      ctx.font = `${FONT_SIZE}px DejaVuSans`
      lines.forEach((line, i) => {
        ctx.fillText(line, field.x, field.y + FONT_SIZE + i * (FONT_SIZE + 2))
      })
      continue
    }

    if (value === "MISSING") {
      ctx.strokeStyle = "rgb(220,0,0)"
      ctx.lineWidth = 2
      ctx.strokeRect(field.x, field.y - boxH, boxW, boxH)
      ctx.fillStyle = "rgb(220,0,0)"
      ctx.font = `${FONT_SIZE}px DejaVuSans`
      ctx.fillText("Missing", field.x + 2, field.y - 8)
    } else {
      ctx.fillStyle = "white"
      ctx.fillRect(field.x, field.y - boxH, boxW, boxH)
      ctx.fillStyle = "black"
      ctx.font = `${FONT_SIZE}px DejaVuSans`
      ctx.fillText(value, field.x, field.y - 2)
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
      ctx.fillStyle = "rgb(220,0,0)"
      ctx.font = `bold ${FONT_SIZE}px DejaVuSansBold`
      ctx.fillText(alertText, COB_ALERT.x, COB_ALERT.y)
    }
  }

  // --- Night Guard circle ---
  ctx.strokeStyle = "black"
  ctx.lineWidth = CIRCLE_THICKNESS
  if (fields.ng_circle === "YES") {
    ctx.beginPath()
    ctx.arc(CIRCLES.ng_yes.cx, CIRCLES.ng_yes.cy, CIRCLE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  } else if (fields.ng_circle === "NO") {
    ctx.beginPath()
    ctx.arc(CIRCLES.ng_no.cx, CIRCLES.ng_no.cy, CIRCLE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  }

  // --- Posterior Comp downgrade circle ---
  if (fields.post_comp_circle === "YES") {
    ctx.beginPath()
    ctx.arc(CIRCLES.post_comp_yes.cx, CIRCLES.post_comp_yes.cy, CIRCLE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  } else if (fields.post_comp_circle === "NO") {
    ctx.beginPath()
    ctx.arc(CIRCLES.post_comp_no.cx, CIRCLES.post_comp_no.cy, CIRCLE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  }

  return canvas.toBuffer("image/jpeg", 95)
}

export function outputFilename(fields: ExtractedFields): string {
  const date = new Date().toISOString().split("T")[0]
  return (
    [fields.patient_name, fields.group_number, date]
      .join(" ")
      .replace(/[/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim() + ".jpg"
  )
}
