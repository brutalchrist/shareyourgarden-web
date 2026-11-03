"use client"

import * as React from "react"
import {
  BanIcon,
  CircleCheckIcon,
  LockIcon,
  MoreVerticalIcon,
  SproutIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { blockConversation, unblockConversation } from "@/lib/conversations"
import type { Conversation } from "@/lib/types"

// Blocking is between people: it applies to every conversation with them.
export function useBlockActions(
  conversation: Conversation,
  onChanged: () => Promise<void> | void
) {
  const t = useTranslations("Messages")
  const [pending, setPending] = React.useState(false)

  const run = async (action: "block" | "unblock") => {
    setPending(true)
    try {
      await (action === "block"
        ? blockConversation(conversation.id)
        : unblockConversation(conversation.id))
      await onChanged()
      toast.success(
        t(action === "block" ? "blocked" : "unblocked", {
          name: conversation.otherUser.name,
        })
      )
      return true
    } catch (error) {
      console.error(error)
      toast.error(t("blockError"))
      return false
    } finally {
      setPending(false)
    }
  }

  return {
    pending,
    block: () => run("block"),
    unblock: () => run("unblock"),
  }
}

/** The "…" menu in a conversation's header. */
export function ConversationActionsMenu({
  conversation,
  onChanged,
}: {
  conversation: Conversation
  onChanged: () => Promise<void> | void
}) {
  const t = useTranslations("Messages")
  const [confirming, setConfirming] = React.useState(false)
  const { pending, block, unblock } = useBlockActions(conversation, onChanged)
  const name = conversation.otherUser.name

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreVerticalIcon />
          <span className="sr-only">{t("actions")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {conversation.blockedByMe ? (
            <DropdownMenuItem onClick={() => void unblock()}>
              <CircleCheckIcon />
              {t("unblock", { name })}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirming(true)}
            >
              <BanIcon />
              {t("block", { name })}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirming}
        onOpenChange={(open) => !pending && setConfirming(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("blockTitle", { name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("blockDescription", { name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                if (await block()) setConfirming(false)
              }}
            >
              {pending && <Spinner aria-hidden />}
              {t("blockConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Takes the composer's place when nobody can write anymore, saying why.
 * The blocked person is not told who blocked; the blocker can undo it here.
 */
export function ReadOnlyNotice({
  conversation,
  onChanged,
}: {
  conversation: Conversation
  onChanged: () => Promise<void> | void
}) {
  const t = useTranslations("Messages")
  const { pending, unblock } = useBlockActions(conversation, onChanged)
  const name = conversation.otherUser.name

  const [Icon, text] =
    conversation.readOnly === "garden-deleted"
      ? [
          SproutIcon,
          t("readOnlyGardenDeleted", { garden: conversation.gardenName }),
        ]
      : conversation.blockedByMe
        ? [BanIcon, t("readOnlyBlockedByMe", { name })]
        : [LockIcon, t("readOnlyBlocked")]

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{text}</p>
      {conversation.readOnly === "blocked" && conversation.blockedByMe && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => void unblock()}
        >
          {pending && <Spinner data-icon="inline-start" aria-hidden />}
          {t("unblockShort")}
        </Button>
      )}
    </div>
  )
}
