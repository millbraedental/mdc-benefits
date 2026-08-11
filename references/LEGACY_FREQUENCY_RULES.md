# Legacy Frequency Rules

These were the exact phrase-oriented frequency rules used through V1.10. They are preserved as a fallback reference while the extractor transitions to semantic interpretation. Do not delete them when adding new wording variants.

## Crown, bridge, and denture

- Crown: D2740, frequency after `1 Tooth per`.
- Bridge: D6245, frequency after `1 Tooth per`.
- Denture: D5110, frequency after `1 Arch per`.
- 12/24/36/48/60/72/84/96/120 months became 1/2/3/4/5/6/7/8/10YR.
- Explicit year values passed through as compact `nYR`.
- Missing intervals became `UNKNOWN`.

## Composite

- D2330, falling back to D2335; frequency after `1 Surface per`.
- 6 months became `6MO`; 12-84 months became 1-7YR.
- `No Frequency Limit` became `No Limit`.
- Unknown values became `UNKNOWN`.

## Fluoride

- D1206, falling back to D1208.
- `1 Visit per 6 Month` -> `1/6M`.
- `2 Visit per 1 Year` -> `2/YR`.
- `1 Visit per 1 Calendar Year` -> `1/YR`.
- `1 Visit per 1 Benefit Period` -> `1/Benefit Period`.
- `2 Visit per 1 Benefit Period` -> `2/Benefit Period`.
- 24/36/48/60 months -> `1/2YR`, `1/3YR`, `1/4YR`, `1/5YR`.
- `No Frequency Limit` -> `Unlimited`; unknown -> `UNKNOWN`.

## Exam and prophy

- Prophy used D1110, falling back to D1120.
- Exam used D0120, falling back to D0140.
- `1 Visit per 6 Month` -> `1/6`.
- `2 Visit per 12 Month` and `2 Visit per 1 Year` -> `2/12`.
- `1 Visit per 24 Month` -> `1/24`.
- `1 Visit per 1 Benefit Period` -> `1/Benefit Period`.
- `2 Visit per 1 Benefit Period` -> `2/YR`.
- `2 Visit per 1 Calendar Year` -> `2/Cal Year`.
- `2 Visit per Contract Year` -> `2/Contract Year`.
- `2 in 12 month window` -> `2/12 Window`.
- `No Frequency Limit` -> `Unlimited`.
- Output combined prophy and exam with ` | `.

## FMX and pano

- D0210 and D0330.
- Month intervals became compact `quantity/months`; year intervals became `1/nYR`.
- Matching values produced one value; different values required review; one missing used the other.
- Shared-frequency references between D0210 and D0330 produced `YES`; both present without a reference produced `NO`; missing data produced `UNKNOWN`.

## Bitewings

- D0274.
- Standard month intervals were intended to become `quantity/months`.
- `1 Visit per 1 Benefit Period` -> `1/12`.
- `2 Visit per 1 Benefit Period` and `2 Visit per 1 Year` -> `2/12`.
- `4 Visit per 1 Benefit Period` and `4 Visit per 1 Calendar Year` -> `4/Cal Year`.
- `No Frequency Limit` -> `Unlimited`; unknown -> `Please Review`.

## Problem-focused exam

- D0140.
- Standard frequency conversions applied.
- `With no other services` -> `No Other Svcs`.
- `Emergency only` -> `Emergency Only`.
- `Separate date of service required` -> `Separate DOS`.
- Frequency and restriction were combined with ` + `.

## SRP

- D4341, falling back to D4342.
- One quadrant per 12/24/36/48/60 months or 1/2/3 years became `1/12`, `1/24`, `1/36`, etc.
- `No Frequency Limit` -> `Unlimited`.
- Four quads per visit -> `4 Quads ok? YES`; fewer than four -> `NO`; missing -> `UNKNOWN`.

## Migration rule

These examples remain valid outputs, but future extraction should interpret equivalent wording semantically. New wording alone must not require a new hard-coded phrase. New business meanings still require an explicit decision and formatter rule.
