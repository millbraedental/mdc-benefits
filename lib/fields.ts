// Pixel coordinates from MASTER_BREAKDOWN_SCRIPT_REV14 (GIMP-style, origin top-left)
// Each field: lower-left x, lower-left y, lower-right x
// Box height is 32px upward from lower-left y (unless noted)

export interface FieldDef {
  key: string
  x: number   // lower-left x
  y: number   // lower-left y
  x2: number  // lower-right x (for box width)
  boxHeight?: number  // default 32
  bold?: boolean
  color?: string // default black
  topDown?: boolean // special rendering for sealants
  maxLines?: number
  maxFontSize?: number
  minFontSize?: number
}

export const FIELDS: FieldDef[] = [
  // Header / admin
  { key: "payor",                x: 837,  y: 145,  x2: 1087, boxHeight: 44, maxLines: 2, maxFontSize: 21, minFontSize: 14 },
  { key: "group_number",         x: 133,  y: 252,  x2: 336  },
  { key: "group_name",           x: 522,  y: 253,  x2: 822, boxHeight: 36, maxLines: 2, minFontSize: 12 },
  { key: "claims_paying_id",     x: 942,  y: 252,  x2: 1152 },
  { key: "effective_date",       x: 916,  y: 356,  x2: 1146 },
  { key: "patient_name",         x: 112,  y: 424,  x2: 417  },
  { key: "patient_id",           x: 480,  y: 423,  x2: 688  },
  { key: "patient_dob",          x: 763,  y: 423,  x2: 898  },
  { key: "subscriber_name",      x: 145,  y: 471,  x2: 351  },

  // History
  { key: "last_bwx",             x: 141,  y: 588,  x2: 281  },
  { key: "last_fmx",             x: 413,  y: 588,  x2: 576  },
  { key: "last_pano",            x: 719,  y: 588,  x2: 867  },
  { key: "last_ex_px",           x: 1000, y: 588,  x2: 1162, maxLines: 2, maxFontSize: 18, minFontSize: 12 },

  // Coverage summary row
  { key: "cal_or_contract_year", x: 250,  y: 823,  x2: 453  },
  { key: "max",                  x: 83,   y: 885,  x2: 208  },
  { key: "ded",                  x: 283,  y: 885,  x2: 395  },
  { key: "waiting_period",       x: 536,  y: 885,  x2: 737  },
  { key: "cob",                  x: 1030, y: 885,  x2: 1186 },

  // Ortho (top-right area)
  { key: "ortho_max",            x: 953,  y: 936,  x2: 1044 },
  { key: "ortho_pct",            x: 1078, y: 936,  x2: 1125 },

  // Sealants (special top-down multiline)
  { key: "sealants",             x: 930,  y: 944,  x2: 1186, topDown: true },

  // Classifications row
  { key: "prev_pct",             x: 87,   y: 948,  x2: 142  },
  { key: "prev_ded",             x: 220,  y: 948,  x2: 249  },
  { key: "basic_pct",            x: 352,  y: 948,  x2: 406  },
  { key: "basic_ded",            x: 481,  y: 948,  x2: 517  },
  { key: "major_pct",            x: 618,  y: 948,  x2: 687  },
  { key: "major_ded",            x: 769,  y: 948,  x2: 805  },

  // Prev apply max
  { key: "prev_apply_max",       x: 211,  y: 1076, x2: 283  },

  // Procedure codes row 1
  { key: "fmx_pct",              x: 93,   y: 1011, x2: 136  },
  { key: "fmx_ded",              x: 217,  y: 1011, x2: 250  },
  { key: "pas_pct",              x: 324,  y: 1011, x2: 369  },
  { key: "pas_ded",              x: 442,  y: 1011, x2: 475  },
  { key: "ext_7210",             x: 616,  y: 1011, x2: 689  },
  { key: "d7220",                x: 759,  y: 1011, x2: 826  },

  // Perio / Endo row
  { key: "perio_pct",            x: 373,  y: 1068, x2: 426  },
  { key: "perio_ded",            x: 511,  y: 1068, x2: 568  },
  { key: "endo_pct",             x: 653,  y: 1068, x2: 709  },
  { key: "endo_ded",             x: 780,  y: 1068, x2: 823  },
  { key: "ng_value",             x: 1108, y: 1068, x2: 1179 },

  // Posterior comps / crown row
  { key: "post_comp_pct",        x: 376,  y: 1158, x2: 457  },
  { key: "crown_pct",            x: 653,  y: 1158, x2: 709  },
  { key: "crown_ded",            x: 780,  y: 1158, x2: 823  },
  { key: "crown_downgrade",      x: 958,  y: 1167, x2: 1171 },

  // Implant / prior ext row
  { key: "implant_d6010",        x: 202,  y: 1219, x2: 270  },
  { key: "prior_ext_ok",         x: 498,  y: 1219, x2: 574  },

  // StayPlate row
  { key: "stayplate_pct",        x: 259,  y: 1288, x2: 409  },
  { key: "stayplate_anterior",   x: 630,  y: 1288, x2: 735  },

  // Assignment of benefits
  { key: "assignment_of_benefits", x: 792, y: 1344, x2: 928 },
  { key: "fee_schedule",         x: 408,  y: 1344, x2: 540, maxLines: 2, maxFontSize: 18, minFontSize: 12 },

  // Frequency row 1
  { key: "freq_crown",           x: 108,  y: 1429, x2: 240  },
  { key: "freq_bridge",          x: 348,  y: 1429, x2: 490  },
  { key: "freq_denture",         x: 615,  y: 1429, x2: 757  },
  { key: "freq_composite",       x: 856,  y: 1429, x2: 973  },
  { key: "freq_fluoride",        x: 1077, y: 1429, x2: 1195, maxLines: 2, maxFontSize: 18, minFontSize: 12 },

  // Frequency row 2
  { key: "freq_exam_prophy",     x: 111,  y: 1474, x2: 466  },
  { key: "freq_fmx_pano",        x: 621,  y: 1474, x2: 741  },
  { key: "freq_fmx_pano_shared", x: 888,  y: 1474, x2: 1002 },
  { key: "freq_bwx",             x: 1071, y: 1474, x2: 1191 },

  // Frequency row 3
  { key: "freq_prob_d140",       x: 141,  y: 1521, x2: 336  },
  { key: "freq_srp",             x: 417,  y: 1527, x2: 876  },
]

// Circle definitions for Yes/No toggle fields
// center_x, center_y, radius 22, thickness 3
export const CIRCLES = {
  ng_yes:        { cx: 991,  cy: 1056 },
  ng_no:         { cx: 1045, cy: 1056 },
  post_comp_yes: { cx: 298,  cy: 1152 },
  post_comp_no:  { cx: 237,  cy: 1152 },
}

// COB alert text placement
export const COB_ALERT = { x: 658, y: 65, x2: 1131 }
