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

import type { ProductType } from "@/lib/products"

// The same drawings the map markers use (see `marker-icon.ts`).
export const PRODUCT_TYPE_ICONS: Record<ProductType, LucideIcon> = {
  vegetable: CarrotIcon,
  fruit: AppleIcon,
  herb: LeafIcon,
  flower: Flower2Icon,
  seed: BeanIcon,
  seedbed: SproutIcon,
  supply: ShovelIcon,
}
