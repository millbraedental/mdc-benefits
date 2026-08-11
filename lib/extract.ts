import OpenAI from "openai"

const client = new OpenAI()

const SYSTEM_PROMPT = `You are a dental insurance benefits data extractor implementing MASTER_BREAKDOWN_SCRIPT_REV22. You will receive one or more dental benefits breakdowns from the Stratus verification platform. Inspect every uploaded document before finalizing values. Extract every field exactly as specified below and return a single JSON object. Do not paraphrase, infer, or assume values. Extract exactly what appears in the source document, then apply the formatting rules.

DOCUMENT PRIORITY:
- The FULL breakdown is authoritative for every field.
- Use the BASIC breakdown only as a fallback when the corresponding value is absent from FULL.
- When FULL and BASIC differ, always use the FULL value. A difference between FULL and BASIC is expected and must never, by itself, set review_required=true or add a review reason.
- Never replace, merge, average, or reconcile a value present in FULL with a value from BASIC. This applies to all sections and columns, including network level, deductibles, coverage percentages, DED Applies, and Max Applies.
- Use IN NETWORK / PREMIER values when FULL identifies that as the active benefit section.
- Never mix PPO, Premier, and Out of Network values unless a field rule explicitly requires comparison.
- Prefer specific CDT procedure-code rows for CDT percentages, deductibles, frequency, shared frequency, downgrades, pre-auth, and limitations.
- Use CLASSIFICATIONS for broad Preventive/Basic/Major percentages, waiting periods, and classification-level Max Applies. Use CODE CATEGORIES only as fallback when CLASSIFICATIONS is incomplete.
- Use TREATMENT HISTORY only for last-service dates.
- Request review only for an ambiguity or internal contradiction that remains within the authoritative FULL breakdown after applying all field-specific rules. BASIC/FULL discrepancies are not review conditions.

EXECUTION MODE: STEPWISE
Extract exactly what appears in the source. Apply field-specific formatting only after harvesting.
If a value is missing and no field-specific exception applies, use the string "MISSING".
Field-specific outputs such as Auth, N/A, UNKNOWN, REVIEW, and Please Review override the general MISSING rule.

GENERAL PARSING:
- Primary pattern: Find SECTION → Find SUBSECTION or ROW → Harvest COLUMN or VALUE
- For TREATMENT HISTORY with multiple dates for the same code: harvest the most recent date
- Date formatting: DD-MMM-YY (e.g. 01-JAN-26, 23-APR-25)
- Percentage formatting: XX% — remove spaces, remove decimals (e.g. 100%, 80%)
- Dollar formatting: $X,XXX — no cents (e.g. $2,000, $1,500)

FIELD EXTRACTION RULES:

patient_name: PATIENT section → First Name + " " + Last Name

subscriber_name: If PATIENT full name matches SUBSCRIBER full name → "Patient". Otherwise → Subscriber First + " " + Last.

group_number: PLAN INFORMATION → Group Number (not Policy ID, not Group Name)

effective_date: PLAN INFORMATION → Original Effective Date. If Original Effective Date is missing, fall back to Current Effective Date. Never use Renewal Date. Format: DD-MMM-YY.

last_bwx: TREATMENT HISTORY → D0274 → most recent date. If no history or D0274 missing → "Auth". Format: DD-MMM-YY or Auth.

last_fmx: TREATMENT HISTORY → D0210 (fallback D0330) → most recent date. If missing → "Auth". Format: DD-MMM-YY or Auth.

last_pano: TREATMENT HISTORY → D0330 (fallback D0210) → most recent date. If missing → "Auth". Format: DD-MMM-YY or Auth.

last_ex_px: TREATMENT HISTORY → D0120 exam date + D1110 (fallback D1120) prophy date. Format: "DD-MMM-YY / DD-MMM-YY". Use "Auth" for either missing part.

cal_or_contract_year: PLAN INFORMATION → Renewal Type. Copy exactly (e.g. "Calendar Year", "Contract Year").

max: GENERAL MAXIMUM → INDIVIDUAL → Amount. Format: $X,XXX no cents.

ded: DEDUCTIBLE INFORMATION → INDIVIDUAL → Amount. Format: $XX or $XXX no cents.

waiting_period: CLASSIFICATIONS → BASIC and MAJOR → Waiting Period values. If both say No → "No". If either says Yes → "Yes". Fallback: check NOTES for "NO WAITING PERIOD" → "No", or "WAITING PERIOD" without NO → "Yes".

cob: Check NOTES for "COB:" first → use that value. Otherwise PLAN LIMITATIONS → COB Rule. If COB Rule is "–" or blank → check COB Applies: No → "No", Yes → "Yes". Copy exactly: "Standard", "NON-DUP", "No", "Yes", etc.

ortho_max: ORTHODONTICS → LIFETIME MAXIMUM → Amount. Format: $X,XXX. If no ORTHODONTICS section → "N/A".

ortho_pct: ORTHODONTICS → COVERAGE DETAILS → Coverage %. If 0, blank, N/A, or not covered per NOTES → "N/A". Format: XX%.

sealants: PROCEDURE CODES → D1351. Output multiline: line1=XX%, line2=age limitation, line3=frequency, line4=tooth limitation. Omit lines that are missing. If % is 0/–/N/A or row missing → "NO". Return as newline-separated string. Rendering is transparent, begins at (930,944), uses 16px line spacing, and must remain above Y=1020. Preserve all lines when possible; if necessary reduce this field only to 16pt, then omit in priority order: tooth, frequency, age.

prev_pct: CLASSIFICATIONS → DIAGNOSTIC & PREVENTIVE → Coverage %. Format: XX%.

prev_ded: CLASSIFICATIONS → DIAGNOSTIC & PREVENTIVE → DED Applies. "Yes" or "No".

prev_apply_max: Primary: CLASSIFICATIONS → DIAGNOSTIC & PREVENTIVE → Max Applies. Fallback: CODE CATEGORIES → MAX APPLIES for Diagnostic, X Ray, and Preventive. All Yes→"Yes"; all No/–→"No"; conflicting values→"Please Review"; no usable value→"MISSING".

basic_pct: CLASSIFICATIONS → BASIC → Coverage %. Format: XX%.

basic_ded: CLASSIFICATIONS → BASIC → DED Applies. "Yes" or "No".

major_pct: CLASSIFICATIONS → MAJOR → Coverage %. Format: XX%.

major_ded: CLASSIFICATIONS → MAJOR → DED Applies. "Yes" or "No".

fmx_pct: PROCEDURE CODES → D0210 (fallback D0330) → % column. Format: XX%.

fmx_ded: PROCEDURE CODES → D0210 (fallback D0330) → DED column. "Yes" or "No". "–" → "No".

pas_pct: PROCEDURE CODES → D0220 (fallback D0230) → % column. Format: XX%.

pas_ded: PROCEDURE CODES → D0220 (fallback D0230) → DED column. "Yes" or "No". "–" → "No".

ext_7210: PROCEDURE CODES → D7210 → % column. Format: XX%.

d7220: PROCEDURE CODES → D7220 → % column. Format: XX%.

perio_pct: CODE CATEGORIES → Periodontics → COVERAGE % column. Format: XX%.

perio_ded: CODE CATEGORIES → Periodontics → DED APPLIES column. "Yes" or "No". "–" → "No".

endo_pct: CODE CATEGORIES → Endodontics → COVERAGE % column. Format: XX%.

endo_ded: CODE CATEGORIES → Endodontics → DED APPLIES column. "Yes" or "No". "–" → "No".

ng_value: PROCEDURE CODES → D9944 → % column. If 0, 0%, No, N/A, "–", or missing → "NO". Otherwise → XX%.
ng_circle: If ng_value is a percentage → "YES". If ng_value is "NO" → "NO".

post_comp_pct: PROCEDURE CODES → D2330 (fallback D2335) → % column. If 0, 0%, "–", N/A → "NO". Otherwise XX%.
post_comp_downgrade: D2330 (fallback D2335) → TREATMENT DETAILS/LIMITATIONS → "Downgrades:". If "Downgrades: None" or no downgrade info → "No". If has downgrade code → "Yes".
post_comp_circle: "AMAL" if post_comp_downgrade is Yes, "YES" if post_comp_downgrade is No.

crown_pct: PROCEDURE CODES → D2740 → % column. Format: XX%.

crown_ded: PROCEDURE CODES → D2740 → DED column. "Yes" or "No". "–" → "No".

crown_downgrade: PROCEDURE CODES → D2740 → TREATMENT DETAILS → look specifically for the text "Downgrades:". If "Downgrades:" is present and contains "Molar"/"Molars" → "Yes - Molar". If "Downgrades: None" → "No". If the D2740 row exists but the word "Downgrades:" does not appear anywhere in its details → "Unknown". If D2740 row missing → "MISSING".

implant_d6010: PROCEDURE CODES → D6010 → % column. If 0, 0%, "–", N/A → "NO". Otherwise XX%.

prior_ext_ok: PLAN LIMITATIONS → Missing Tooth Clause. No → "YES". Yes → "NO". "–"/blank/missing → "AUTH".

stayplate_pct: PROCEDURE CODES → D5820 → % column. If 0, 0%, "–", N/A → "NO". Otherwise XX%.

stayplate_anterior: PROCEDURE CODES → D5820 → LIMITATIONS/TREATMENT DETAILS. If anterior-only language → "YES". If explicitly all teeth → "NO". If row exists but no info, or row missing → "UNKNOWN".

assignment_of_benefits: NETWORK COVERAGE → Assignment of Benefits. Provider/Pays Provider/Provider Paid/Yes → "YES". Patient/Member/Pays Patient/Patient Reimbursement/Non-Assigned/No → "NO". If primary value is missing or unclear, inspect NOTES for payment-to-provider/member wording. If notes make payment provider-dependent on signature/authorization on file → "YES". "–"/blank/unrecognized → "REVIEW".

freq_crown: PROCEDURE CODES → D2740 → LIMITATIONS → frequency after "1 Tooth per". Convert months to years: 12mo→"1YR", 24mo→"2YR", 36mo→"3YR", 48mo→"4YR", 60mo→"5YR", 72mo→"6YR", 84mo→"7YR", 96mo→"8YR", 120mo→"10YR". Year inputs pass through directly: "8 Year"→"8YR", "10 Year"→"10YR", "5 Year"→"5YR". If no interval → "UNKNOWN".

freq_bridge: PROCEDURE CODES → D6245 → LIMITATIONS → frequency after "1 Tooth per". Same month-to-year conversion as freq_crown. If no interval → "UNKNOWN".

freq_denture: PROCEDURE CODES → D5110 → LIMITATIONS → frequency after "1 Arch per". Same month-to-year conversion as freq_crown. If no interval → "UNKNOWN".

freq_composite: PROCEDURE CODES → D2330 (fallback D2335) → LIMITATIONS → "1 Surface per X". Convert: 6mo→"6MO", 12mo/1yr→"1YR", 24mo/2yr→"2YR", 36mo/3yr→"3YR", 48mo/4yr→"4YR", 60mo/5yr→"5YR", 72mo/6yr→"6YR", 84mo/7yr→"7YR". "No Frequency Limit"→"No Limit". Unknown→"UNKNOWN".

freq_fluoride: PROCEDURE CODES → D1206 (fallback D1208) → LIMITATIONS. Convert: "1 Visit per 6 Month"→"1/6M", "2 Visit per 1 Year"→"2/YR", "1 Visit per 1 Calendar Year"→"1/YR", "1 Visit per 24 Month"→"1/2YR". "No Frequency Limit"→"Unlimited". Unknown→"UNKNOWN".

freq_exam_prophy: PROCEDURE CODES → D1110 (fallback D1120) prophy freq + D0120 (fallback D0140) exam freq. Convert: "1 Visit per 6 Month"→"1/6", "2 Visit per 12 Month"→"2/12", "2 Visit per 1 Year"→"2/12", "1 Visit per 24 Month"→"1/24", "1 Visit per 1 Benefit Period"→"1/Benefit Period", "2 Visit per 1 Benefit Period"→"2/YR", "2 Visit per 1 Calendar Year"→"2/Cal Year", "2 Visit per Contract Year"→"2/Contract Year", "2 in 12 month window"→"2/12 Window", "No Frequency Limit"→"Unlimited". Apply the same conversions independently to both the prophy and exam values. Output format: "ProphyFreq | ExamFreq". If one is missing or unrecognized use "Please Review" for that part; if both missing output a single "Please Review".

freq_fmx_pano: PROCEDURE CODES → D0210 + D0330 frequencies. Convert months to compact form: 60mo→"1/60", "1 Visit per 5 Year"→"1/5YR", etc. If both match → single value. If differ → "Please Review". If one missing → use the other.

freq_fmx_pano_shared: D0210 and D0330 LIMITATIONS → "Shared Freq:". If D0210 references D0330 OR D0330 references D0210 → "YES". If both exist and no shared freq → "NO". If one/both missing → "UNKNOWN".

freq_bwx: PROCEDURE CODES → D0274 → LIMITATIONS. Convert standard month intervals to quantity/months. "1 Visit per 1 Benefit Period"→"1/12". "2 Visit per 1 Benefit Period" or "2 Visit per 1 Year"→"2/12". "4 Visit per 1 Benefit Period" or "4 Visit per 1 Calendar Year"→"4/Cal Year". "No Frequency Limit"→"Unlimited". Unknown→"Please Review".

freq_prob_d140: PROCEDURE CODES → D0140 → LIMITATIONS. Standard freq conversions apply. Special: "With no other services"→"No Other Svcs", "Emergency only"→"Emergency Only", "Separate date of service required"→"Separate DOS". If both freq and restriction: combine, e.g. "2/12 + No Other Svcs". Missing→"Please Review".

freq_srp: PROCEDURE CODES → D4341 (fallback D4342) → frequency + Quads/Visit. Frequency: convert 1 Quadrant per 12/24/36/48/60 Month or 1/2/3 Year to 1/12, 1/24, 1/36, etc.; No Frequency Limit→Unlimited; unrecognized→Please Review. Quads/Visit: 4→"4 Quads ok? YES", <4→"4 Quads ok? NO", missing→"4 Quads ok? UNKNOWN". Output: "Freq 4 Quads ok? YES/NO/UNKNOWN".

REV22 ADDITIONAL FIELDS:
patient_id: PLAN INFORMATION → Policy ID first. Fallback priority: Member ID, Subscriber ID, Patient ID, ID Number, Member Number, SS#, Social Security Number. Preserve exact letters, digits, leading zeros, and hyphens. Missing→"N/A".
patient_dob: PATIENT → DOB (fallback Date of Birth). Patient DOB only. Format DD-MMM-YY. Missing→"N/A".
claims_paying_id: PAYER DETAILS → Claims Paying ID (fallback Payer ID). Then NOTES → PAYOR ID/PAYER ID. Preserve exact value. Missing→"N/A".
payor: PAYER DETAILS → Payer Name. Copy exactly. Missing→"MISSING".
group_name: PLAN INFORMATION → Group Name. Do not use Group Number, Plan Number, Policy ID, or employer address. Copy exactly. Missing→"MISSING".
fee_schedule: NETWORK COVERAGE → Fee Schedule. Trim surrounding whitespace and compare case-insensitively. If the value is exactly "DELTA DENTAL PREMIER" or "PREMIER", output "PREMIER" and do not request review. For every other value, including blank, missing, or "–", set this field to "Please Review", set review_required=true, and add a review_conflicts item for field_key "fee_schedule". Label it "Fee Schedule"; include the exact Stratus Fee Schedule wording in source_details; and provide these normalized options in this order: "DPO-CAP", "UCR", "LOW-FEE", "HIGH-FEE", "AUTH". The user interface supplies the additional custom-value option.

REV22 FREQUENCY EXPANSIONS:
- Fluoride supports Benefit Period: 1 Visit→"1/Benefit Period", 2 Visit→"2/Benefit Period"; 24/36/48/60 Month→"1/2YR", "1/3YR", "1/4YR", "1/5YR".
- FMX/PANO supports 6/12/24/36/48/60 Month→"1/6", "1/12", etc., and year intervals→"1/3YR", "1/5YR", etc.
- Crown, bridge, and denture year intervals output as compact "8YR", "10YR", etc.; missing/unrecognized→"UNKNOWN".

RENDERING/REVIEW METADATA:
review_required: true only when the authoritative FULL breakdown contains an internal contradiction or ambiguity that cannot be resolved under these rules. Differences between FULL and BASIC never require review. Otherwise false.
review_reasons: concise descriptions of every unresolved ambiguity within FULL. Do not mention BASIC/FULL discrepancies. Use an empty array when review_required=false.
review_conflicts: one item for every user-resolvable ambiguity within FULL. Each item must contain: field_key (the exact output field affected), label (short human-readable field/code name), question (what the user must decide), options (two or more compact normalized values suitable for rendering), and source_details (the conflicting source wording corresponding to the options). For example, conflicting D0274 limitations belong to field_key "freq_bwx" with options such as "1/Cal Year" and "2/Cal Year". Set the affected output field to "Please Review" until the user chooses. Use an empty array when there are no conflicts.

The active boilerplate and output are 1224×1584 pixels at 72 DPI. The outdated REV22 reference to 300 DPI must not be applied.

Return ONLY a valid JSON object with all of the above keys. No explanation, no markdown fences, no extra text.`

export interface ExtractedFields {
  payor: string
  patient_name: string
  patient_id: string
  patient_dob: string
  subscriber_name: string
  group_number: string
  group_name: string
  claims_paying_id: string
  fee_schedule: string
  effective_date: string
  last_bwx: string
  last_fmx: string
  last_pano: string
  last_ex_px: string
  cal_or_contract_year: string
  max: string
  ded: string
  waiting_period: string
  cob: string
  ortho_max: string
  ortho_pct: string
  sealants: string
  prev_pct: string
  prev_ded: string
  prev_apply_max: string
  basic_pct: string
  basic_ded: string
  major_pct: string
  major_ded: string
  fmx_pct: string
  fmx_ded: string
  pas_pct: string
  pas_ded: string
  ext_7210: string
  d7220: string
  perio_pct: string
  perio_ded: string
  endo_pct: string
  endo_ded: string
  ng_value: string
  ng_circle: string
  post_comp_pct: string
  post_comp_downgrade: string
  post_comp_circle: string
  crown_pct: string
  crown_ded: string
  crown_downgrade: string
  implant_d6010: string
  prior_ext_ok: string
  stayplate_pct: string
  stayplate_anterior: string
  assignment_of_benefits: string
  freq_crown: string
  freq_bridge: string
  freq_denture: string
  freq_composite: string
  freq_fluoride: string
  freq_exam_prophy: string
  freq_fmx_pano: string
  freq_fmx_pano_shared: string
  freq_bwx: string
  freq_prob_d140: string
  freq_srp: string
  review_required: boolean
  review_reasons: string[]
  review_conflicts: ReviewConflict[]
}

export interface ReviewConflict {
  field_key: string
  label: string
  question: string
  options: string[]
  source_details: string[]
}

export const FIELD_KEYS = [
  "payor",
  "patient_name",
  "patient_id",
  "patient_dob",
  "subscriber_name",
  "group_number",
  "group_name",
  "claims_paying_id",
  "fee_schedule",
  "effective_date",
  "last_bwx",
  "last_fmx",
  "last_pano",
  "last_ex_px",
  "cal_or_contract_year",
  "max",
  "ded",
  "waiting_period",
  "cob",
  "ortho_max",
  "ortho_pct",
  "sealants",
  "prev_pct",
  "prev_ded",
  "prev_apply_max",
  "basic_pct",
  "basic_ded",
  "major_pct",
  "major_ded",
  "fmx_pct",
  "fmx_ded",
  "pas_pct",
  "pas_ded",
  "ext_7210",
  "d7220",
  "perio_pct",
  "perio_ded",
  "endo_pct",
  "endo_ded",
  "ng_value",
  "ng_circle",
  "post_comp_pct",
  "post_comp_downgrade",
  "post_comp_circle",
  "crown_pct",
  "crown_ded",
  "crown_downgrade",
  "implant_d6010",
  "prior_ext_ok",
  "stayplate_pct",
  "stayplate_anterior",
  "assignment_of_benefits",
  "freq_crown",
  "freq_bridge",
  "freq_denture",
  "freq_composite",
  "freq_fluoride",
  "freq_exam_prophy",
  "freq_fmx_pano",
  "freq_fmx_pano_shared",
  "freq_bwx",
  "freq_prob_d140",
  "freq_srp",
] as const satisfies readonly (keyof ExtractedFields)[]

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    ...Object.fromEntries(FIELD_KEYS.map((key) => [key, { type: "string" }])),
    review_required: { type: "boolean" },
    review_reasons: { type: "array", items: { type: "string" } },
    review_conflicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field_key: { type: "string", enum: FIELD_KEYS },
          label: { type: "string" },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          source_details: { type: "array", items: { type: "string" } },
        },
        required: ["field_key", "label", "question", "options", "source_details"],
        additionalProperties: false,
      },
    },
  },
  required: [...FIELD_KEYS, "review_required", "review_reasons", "review_conflicts"],
  additionalProperties: false,
} as const

export interface PdfInput {
  role: "full" | "basic"
  filename: string
  buffer: Buffer
}

export interface CostEstimate {
  model: string
  inputTokens: number
  cachedInputTokens: number
  cacheWriteTokens: number
  outputTokens: number
  usd: number
}

export class ReviewRequiredError extends Error {
  constructor(
    public readonly reasons: string[],
    public readonly cost: CostEstimate | null = null
  ) {
    super("Review required before rendering.")
    this.name = "ReviewRequiredError"
  }
}

function isFullBasicDiscrepancy(reason: string): boolean {
  return /\bfull\b[\s\S]*\bbasic\b|\bbasic\b[\s\S]*\bfull\b/i.test(reason)
}

const MODEL_PRICING: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-5.6": { input: 5, cached: 0.5, output: 30 },
  "gpt-5.6-sol": { input: 5, cached: 0.5, output: 30 },
  "gpt-5.6-terra": { input: 2.5, cached: 0.25, output: 15 },
  "gpt-5.6-luna": { input: 1, cached: 0.1, output: 6 },
}

function estimateCost(
  model: string,
  usage: OpenAI.Responses.ResponseUsage | null | undefined
): CostEstimate | null {
  if (!usage) return null

  const pricingKey = Object.keys(MODEL_PRICING).sort((a, b) => b.length - a.length).find(
    (key) => model === key || model.startsWith(`${key}-`)
  )
  if (!pricingKey) return null

  const rates = MODEL_PRICING[pricingKey]
  const cachedInputTokens = usage.input_tokens_details.cached_tokens ?? 0
  const cacheWriteTokens = usage.input_tokens_details.cache_write_tokens ?? 0
  const uncachedInputTokens = Math.max(0, usage.input_tokens - cachedInputTokens - cacheWriteTokens)
  const longPromptMultiplier = usage.input_tokens > 272_000 ? 2 : 1
  const outputMultiplier = usage.input_tokens > 272_000 ? 1.5 : 1

  const usd =
    ((uncachedInputTokens * rates.input +
      cachedInputTokens * rates.cached +
      cacheWriteTokens * rates.input * 1.25) * longPromptMultiplier +
      usage.output_tokens * rates.output * outputMultiplier) /
    1_000_000

  return {
    model,
    inputTokens: usage.input_tokens,
    cachedInputTokens,
    cacheWriteTokens,
    outputTokens: usage.output_tokens,
    usd,
  }
}

function validateExtractedFields(fields: ExtractedFields, deferredFields = new Set<string>()): string[] {
  const reasons: string[] = []

  for (const key of FIELD_KEYS) {
    if (typeof fields[key] !== "string") {
      reasons.push(`${key} was not returned as text.`)
    }
  }

  const datePattern = /^(?:\d{2}-[A-Z]{3}-\d{2}|MISSING|N\/A|Auth)$/
  for (const key of ["effective_date", "last_bwx", "last_fmx", "last_pano", "patient_dob"] as const) {
    if (!deferredFields.has(key) && !datePattern.test(fields[key])) {
      reasons.push(`${key} has an invalid REV22 date value: ${fields[key]}`)
    }
  }

  if (!deferredFields.has("max") && !/^(?:\$[\d,]+|MISSING)$/.test(fields.max)) {
    reasons.push(`max has an invalid dollar value: ${fields.max}`)
  }
  if (!deferredFields.has("ded") && !/^(?:\$[\d,]+|MISSING)$/.test(fields.ded)) {
    reasons.push(`ded has an invalid dollar value: ${fields.ded}`)
  }

  return reasons
}

export async function extractFields(
  pdfs: PdfInput[]
): Promise<{
  fields: ExtractedFields
  cost: CostEstimate | null
  conflicts: ReviewConflict[]
  reviewReasons: string[]
}> {
  if (pdfs.length === 0) {
    throw new Error("At least one benefits PDF is required.")
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-terra"
  const response = await client.responses.create({
    model,
    instructions: SYSTEM_PROMPT,
    store: false,
    input: [
      {
        role: "user",
        content: [
          ...pdfs.map((pdf) => ({
            type: "input_file",
            filename: `${pdf.role.toUpperCase()} BREAKDOWN - ${pdf.filename}`,
            file_data: `data:application/pdf;base64,${pdf.buffer.toString("base64")}`,
            detail: "high" as const,
          } as const)),
          {
            type: "input_text",
            text: "Inspect every attached patient document, apply REV22 document priority, and return the complete structured field object.",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "benefits_fields",
        strict: true,
        schema: OUTPUT_SCHEMA,
      },
    },
  })

  if (!response.output_text) {
    throw new Error("OpenAI returned no extracted field data.")
  }

  const fields = JSON.parse(response.output_text) as ExtractedFields
  const cost = estimateCost(model, response.usage)
  const modelReviewReasons = fields.review_reasons.filter(
    (reason) => !isFullBasicDiscrepancy(reason)
  )
  const conflicts = fields.review_conflicts.filter((conflict) =>
    !isFullBasicDiscrepancy([
      conflict.question,
      ...conflict.source_details,
    ].join(" "))
  )
  const validationReasons = validateExtractedFields(
    fields,
    new Set(conflicts.map((conflict) => conflict.field_key))
  )

  if (validationReasons.length > 0) {
    throw new ReviewRequiredError(
      validationReasons,
      cost
    )
  }

  if (fields.review_required && conflicts.length === 0 && modelReviewReasons.length === 0) {
    throw new ReviewRequiredError(["The extraction requires manual review."], cost)
  }

  return { fields, cost, conflicts, reviewReasons: modelReviewReasons }
}
