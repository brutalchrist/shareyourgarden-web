"use client"

import { RotateCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ReloadButton({ children }: { children: React.ReactNode }) {
  return (
    <Button onClick={() => window.location.reload()}>
      <RotateCwIcon />
      {children}
    </Button>
  )
}
