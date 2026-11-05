import {
  AppleIcon,
  BeanIcon,
  CarrotIcon,
  Flower2Icon,
  LeafIcon,
  ShovelIcon,
  SproutIcon,
  type LucideIcon,
} from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"

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

export const PRODUCT_TYPE_ICONS: Record<ProductType, LucideIcon> = {
  vegetable: CarrotIcon,
  fruit: AppleIcon,
  herb: LeafIcon,
  flower: Flower2Icon,
  seed: BeanIcon,
  seedbed: SproutIcon,
  supply: ShovelIcon,
}

// Photos per product; the backend enforces the same limit.
export const PRODUCT_IMAGES_MAX = 3

export const PRODUCT_UNITS = ["unit", "kg", "g", "bunch", "l"] as const
export type ProductUnit = (typeof PRODUCT_UNITS)[number]

export function isProductType(value: unknown): value is ProductType {
  return PRODUCT_TYPES.includes(value as ProductType)
}

export function isProductUnit(value: unknown): value is ProductUnit {
  return PRODUCT_UNITS.includes(value as ProductUnit)
}

// Labels in the active locale, from the `Products` messages. Unknown values
// (gardens saved before the codes) show as stored.
export function useProductLabels() {
  const t = useTranslations("Products")
  const format = useFormatter()

  return {
    productTypeLabel: (type: string) =>
      isProductType(type) ? t(`types.${type}`) : type,

    // The plural form, for pickers listing the units.
    productUnitLabel: (unit: string) =>
      isProductUnit(unit) ? t(`units.${unit}`) : unit,

    // "1 atado", "2,5 kilogramos".
    formatQuantity: (quantity: number, unit?: string) => {
      const amount = format.number(quantity, { maximumFractionDigits: 2 })

      if (!unit) return amount
      if (!isProductUnit(unit)) return `${amount} ${unit}`

      return t(`quantities.${unit}`, { amount, count: quantity })
    },
  }
}
