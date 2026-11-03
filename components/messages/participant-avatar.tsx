import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Participant } from "@/lib/types"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export function ParticipantAvatar({
  participant,
  className,
}: {
  participant: Participant
  className?: string
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {participant.picture && (
        <AvatarImage
          src={participant.picture}
          alt=""
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback>{initials(participant.name)}</AvatarFallback>
    </Avatar>
  )
}
