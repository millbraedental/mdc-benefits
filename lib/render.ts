import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas"
import * as fs from "fs"
import * as path from "path"
import { FIELDS, CIRCLES, COB_ALERT } from "./fields"
import type { ExtractedFields } from "./extract"

const FONT_SIZE = 18
const BOX_HEIGHT = 32
const CIRCLE_RADIUS = 22
const CIRCLE_THICKNESS = 3

function wrapText(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []

  for (const word of words) {
    const candidate = lines.length === 0 ? word : `${lines[lines.length - 1]} ${word}`
    if (lines.length === 0 || ctx.measureText(candidate).width <= maxWidth) {
      if (lines.length === 0) lines.push(word)
      else lines[lines.length - 1] = candidate
    } else {
      lines.push(word)
    }
  }

  return lines
}

function fitWrappedText(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  maxWidth: number,
  maxLines: number,
  maxFontSize: number,
  minFontSize: number
): { fontSize: number; lines: string[] } {
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize--) {
    ctx.font = `${fontSize}px DejaVuSansBold`
    const lines = wrapText(ctx, text, maxWidth)
    if (lines.length <= maxLines) return { fontSize, lines }
  }

  ctx.font = `${minFontSize}px DejaVuSansBold`
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines)
  let lastLine = lines[maxLines - 1] ?? ""
  while (lastLine && ctx.measureText(`${lastLine}…`).width > maxWidth) {
    lastLine = lastLine.slice(0, -1).trimEnd()
  }
  lines[maxLines - 1] = `${lastLine}…`
  return { fontSize: minFontSize, lines }
}

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
      // REV22 Sealants: transparent top-down multiline, ending above Y=1020.
      const sourceLines = value.split("\n").map((line) => line.trim()).filter(Boolean)
      let fontSize = FONT_SIZE
      let lines = sourceLines
      const boundaryY = 1020
      const lineSpacing = 16

      if (field.y + fontSize + Math.max(0, lines.length - 1) * lineSpacing > boundaryY) {
        fontSize = 16
      }

      const maxLines = Math.floor((boundaryY - field.y - fontSize) / lineSpacing) + 1
      if (lines.length > maxLines) {
        lines = lines.slice(0, Math.max(1, maxLines))
      }

      ctx.fillStyle = "black"
      ctx.font = `${fontSize}px DejaVuSansBold`
      lines.forEach((line, i) => {
        ctx.fillText(line, field.x, field.y + fontSize + i * lineSpacing)
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
      const redFeeSchedules = new Set(["DPO-CAP", "LOW-FEE", "AUTH"])
      ctx.fillStyle = field.key === "fee_schedule" && redFeeSchedules.has(value.trim().toUpperCase())
        ? "rgb(220,0,0)"
        : "black"
      if (field.maxLines && field.maxLines > 1) {
        const horizontalPadding = 2
        const maxFontSize = Math.min(
          field.maxFontSize ?? FONT_SIZE,
          Math.floor((boxH - 2) / field.maxLines) - 1
        )
        const fitted = fitWrappedText(
          ctx,
          value,
          boxW - horizontalPadding * 2,
          field.maxLines,
          maxFontSize,
          field.minFontSize ?? 12
        )
        const lineHeight = fitted.fontSize + 1
        const totalHeight = fitted.lines.length * lineHeight
        const firstBaseline = field.y - (boxH - totalHeight) / 2 - totalHeight + fitted.fontSize
        fitted.lines.forEach((line, index) => {
          ctx.fillText(line, field.x + horizontalPadding, firstBaseline + index * lineHeight)
        })
      } else {
        ctx.font = `${FONT_SIZE}px DejaVuSansBold`
        ctx.fillText(value, field.x, field.y - 2)
      }
    }
  }

  // --- COB Alert ---
  const cob = fields.cob?.trim()
  {
    const alertText =
      cob === "Standard"
        ? null
        : !cob || cob === "MISSING" || cob === "REVIEW"
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
    ctx.strokeStyle = "rgb(0,150,70)"
    ctx.beginPath()
    ctx.arc(CIRCLES.ng_yes.cx, CIRCLES.ng_yes.cy, CIRCLE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  } else if (fields.ng_circle === "NO") {
    ctx.beginPath()
    ctx.arc(CIRCLES.ng_no.cx, CIRCLES.ng_no.cy, CIRCLE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  }

  // --- Posterior Comp downgrade circle ---
  ctx.strokeStyle = "black"
  const posteriorDowngrade = fields.post_comp_downgrade?.trim().toUpperCase()
  if (posteriorDowngrade === "YES") {
    ctx.strokeStyle = "rgb(220,0,0)"
    ctx.beginPath()
    ctx.arc(CIRCLES.post_comp_amalgam.cx, CIRCLES.post_comp_amalgam.cy, CIRCLE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  } else if (posteriorDowngrade === "NO") {
    ctx.beginPath()
    ctx.arc(CIRCLES.post_comp_yes.cx, CIRCLES.post_comp_yes.cy, CIRCLE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  }

  return canvas.toBuffer("image/jpeg", 95)
}

export function outputFilename(fields: ExtractedFields): string {
  const date = new Date().toISOString().split("T")[0]
  const groupNumber = fields.group_number === "MISSING" ? "UNKNOWN GROUP NUMBER" : fields.group_number
  const groupName = fields.group_name === "MISSING" ? "UNKNOWN GROUP NAME" : fields.group_name
  return (
    [fields.patient_name, groupNumber, groupName, date]
      .join(" ")
      .replace(/[/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim() + ".jpg"
  )
}
