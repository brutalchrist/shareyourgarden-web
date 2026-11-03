import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User } from "@/lib/types"
import { cn } from "@/lib/utils"

function initials(user: User) {
  const source = user.name ?? user.email
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export function UserAvatar({
  user,
  className,
}: {
  user: User
  className?: string
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {user.picture && (
        <AvatarImage
          src={user.picture}
          alt={user.name ?? user.email}
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback>{initials(user)}</AvatarFallback>
    </Avatar>
  )
}
