import { Suspense } from "react"

import { EditGarden } from "@/components/gardens/edit-garden"

export default function EditGardenPage() {
  return (
    // The garden id is read from the query string, which is only known in the
    // browser for this statically exported page.
    <Suspense>
      <EditGarden />
    </Suspense>
  )
}
