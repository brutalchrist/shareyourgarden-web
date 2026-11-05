import { Suspense } from "react"

import { NewGarden } from "@/components/gardens/new-garden"

export default function NewGardenPage() {
  return (
    // On phones the step is read from the query string, which is only known in
    // the browser for this statically exported page.
    <Suspense>
      <NewGarden />
    </Suspense>
  )
}
