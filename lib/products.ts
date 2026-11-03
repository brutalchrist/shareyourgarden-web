// Product types and units travel and persist as stable codes, so the interface
// can be translated without touching stored gardens. The backend validates the
// same lists.
export const PRODUCT_TYPES = [
  "vegetable",
  "fruit",
  "herb",
  "flower",
  "seed",
  "seedbed",
  "supply",
] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const PRODUCT_UNITS = ["unit", "kg", "g", "bunch", "l"] as const
export type ProductUnit = (typeof PRODUCT_UNITS)[number]

// Spanish labels until the interface gets translations; then these become
// message catalog entries keyed by the same codes.
const LOCALE = "es"

const TYPE_LABELS: Record<ProductType, string> = {
  vegetable: "Verdura",
  fruit: "Fruta",
  herb: "Hierba",
  flower: "Flor",
  seed: "Semilla",
  seedbed: "Almácigo",
  supply: "Insumo",
}

const UNIT_LABELS: Record<
  ProductUnit,
  Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }
> = {
  unit: { one: "unidad", other: "unidades" },
  kg: { one: "kilogramo", other: "kilogramos" },
  g: { one: "gramo", other: "gramos" },
  bunch: { one: "atado", other: "atados" },
  l: { one: "litro", other: "litros" },
}

const pluralRules = new Intl.PluralRules(LOCALE)
const numberFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })

export function isProductType(value: unknown): value is ProductType {
  return PRODUCT_TYPES.includes(value as ProductType)
}

export function isProductUnit(value: unknown): value is ProductUnit {
  return PRODUCT_UNITS.includes(value as ProductUnit)
}

// Unknown values (gardens saved before the codes) show as stored.
export function productTypeLabel(type: string) {
  return isProductType(type) ? TYPE_LABELS[type] : type
}

// The plural form, for pickers listing the units.
export function productUnitLabel(unit: string) {
  return isProductUnit(unit) ? UNIT_LABELS[unit].other : unit
}

// "1 atado", "2,5 kilogramos".
export function formatQuantity(quantity: number, unit?: string) {
  const amount = numberFormat.format(quantity)

  if (!unit) return amount
  if (!isProductUnit(unit)) return `${amount} ${unit}`

  const forms = UNIT_LABELS[unit]
  return `${amount} ${forms[pluralRules.select(quantity)] ?? forms.other}`
}
