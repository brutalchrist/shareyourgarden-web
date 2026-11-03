"use client"

import * as React from "react"
import {
  CheckIcon,
  LockIcon,
  MessageCircleIcon,
  PencilIcon,
  SendIcon,
  SproutIcon,
  XIcon,
} from "lucide-react"
import { useFormatter, useNow, useTranslations } from "next-intl"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Link } from "@/i18n/navigation"
import { ApiError } from "@/lib/api"
import {
  findConversationAboutGarden,
  startConversation,
} from "@/lib/conversations"
import { gardenEditHref } from "@/lib/gardens"
import type { Conversation, Garden } from "@/lib/types"
import { cn } from "@/lib/utils"

const MESSAGE_MAX_LENGTH = 2000
// The character counter only shows up close to the limit.
const COUNTER_THRESHOLD = 1800

type Panel = "signin" | "compose" | null

/**
 * The garden drawer's call to action for writing to the owner. Anonymous
 * visitors see it too, locked, and can sign in right there; the composer then
 * opens on its own. Render it with `key={garden.id}` so it resets per garden.
 */
export function ContactGarden({ garden }: { garden: Garden }) {
  const t = useTranslations("ContactGarden")
  const { user, status } = useAuth()
  const [panel, setPanel] = React.useState<Panel>(null)
  const [conversation, setConversation] = React.useState<Conversation | null>(
    null
  )

  const isAuthenticated = status === "authenticated"
  const isOwner = isAuthenticated && garden.ownerId === user?.id
  const canWrite = isAuthenticated && !isOwner && Boolean(garden.ownerId)

  React.useEffect(() => {
    if (!canWrite) {
      return
    }

    const controller = new AbortController()
    findConversationAboutGarden(garden.id, controller.signal)
      .then(setConversation)
      .catch((error) => {
        // Only a hint for the CTA: without it the user can still write.
        if (!controller.signal.aborted) console.error(error)
      })

    return () => controller.abort()
  }, [canWrite, garden.id])

  // Signing in from the prompt carries on to what the visitor wanted to do.
  const visiblePanel: Panel =
    panel === "signin" && isAuthenticated ? (isOwner ? null : "compose") : panel

  if (status === "loading") {
    return <Skeleton className="h-10 w-full rounded-md" />
  }

  if (isOwner) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-muted-foreground">
          <SproutIcon className="size-4" />
          {t("ownGarden")}
        </p>
        <Button
          variant="outline"
          render={<Link href={gardenEditHref(garden.id)} />}
          nativeButton={false}
        >
          <PencilIcon data-icon="inline-start" />
          {t("edit")}
        </Button>
      </div>
    )
  }

  // Legacy gardens without an owner id have nobody to write to.
  if (!garden.ownerId) {
    return null
  }

  if (visiblePanel === "signin") {
    return (
      <SignInRequired
        ownerName={garden.owner.name}
        onCancel={() => setPanel(null)}
      />
    )
  }

  if (visiblePanel === "compose") {
    return (
      <QuickComposer
        garden={garden}
        onCancel={() => setPanel(null)}
        onSent={(updated) => {
          setConversation(updated)
          setPanel(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {conversation?.lastMessage && (
        <PreviousConversation conversation={conversation} />
      )}
      <Button
        size="lg"
        className="w-full"
        onClick={() => setPanel(isAuthenticated ? "compose" : "signin")}
      >
        <MessageCircleIcon data-icon="inline-start" />
        {conversation ? t("writeAgain") : t("proposeExchange")}
        {!isAuthenticated && (
          <LockIcon
            data-icon="inline-end"
            className="ml-auto opacity-70"
            aria-label={t("requiresAccount")}
          />
        )}
      </Button>
    </div>
  )
}

function PreviousConversation({
  conversation,
}: {
  conversation: Conversation
}) {
  const t = useTranslations("ContactGarden")
  const format = useFormatter()
  // Re-renders every minute so "2 minutes ago" stays current.
  const now = useNow({ updateInterval: 60_000 })
  const lastMessage = conversation.lastMessage!
  const mine = lastMessage.senderId !== conversation.otherUser.id

  return (
    <div className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-muted-foreground">
      <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p>
          {mine
            ? t("youWrote", {
                when: format.relativeTime(new Date(lastMessage.createdAt), now),
              })
            : t("theyReplied", {
                name: conversation.otherUser.name,
                when: format.relativeTime(new Date(lastMessage.createdAt), now),
              })}
        </p>
        <p className="truncate text-foreground">{lastMessage.body}</p>
      </div>
    </div>
  )
}

function SignInRequired({
  ownerName,
  onCancel,
}: {
  ownerName: string
  onCancel: () => void
}) {
  const t = useTranslations("ContactGarden")
  const titleId = React.useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LockIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="font-medium">
            {t("signInTitle", { name: ownerName })}
          </h3>
          <p className="text-muted-foreground">{t("signInDescription")}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="-mt-1 -mr-1"
          onClick={onCancel}
        >
          <XIcon />
          <span className="sr-only">{t("notNow")}</span>
        </Button>
      </div>
      <ul className="flex flex-col gap-1.5 text-muted-foreground">
        {(["benefitExchange", "benefitInbox"] as const).map((key) => (
          <li key={key} className="flex items-center gap-2">
            <CheckIcon className="size-4 shrink-0 text-primary" />
            {t(key)}
          </li>
        ))}
      </ul>
      <GoogleSignInButton fullWidth />
    </section>
  )
}

// Product names are written as titles ("Tomate"); mid-sentence they read
// better in lower case, unless they look like an acronym.
function lowerFirst(text: string): string {
  return /^\p{Lu}{2}/u.test(text)
    ? text
    : text.charAt(0).toLocaleLowerCase() + text.slice(1)
}

function firstName(name: string): string {
  // Owners without a name are stored with their email as name.
  return name.includes("@") ? "" : (name.trim().split(/\s+/)[0] ?? "")
}

function QuickComposer({
  garden,
  onCancel,
  onSent,
}: {
  garden: Garden
  onCancel: () => void
  onSent: (conversation: Conversation) => void
}) {
  const t = useTranslations("ContactGarden")
  const [product, setProduct] = React.useState<string | null>(null)
  // null while the user has not edited the suggested message, so it can
  // follow the selected product.
  const [draft, setDraft] = React.useState<string | null>(null)
  const [sending, setSending] = React.useState(false)
  const titleId = React.useId()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const name = firstName(garden.owner.name)
  const greeting = name ? t("greetingName", { name }) : t("greeting")
  const suggestion = product
    ? t("templateProduct", { greeting, product: lowerFirst(product) })
    : t("templateGeneral", { greeting })
  const message = draft ?? suggestion
  const tooLong = message.length > MESSAGE_MAX_LENGTH
  const canSend = message.trim().length > 0 && !tooLong && !sending
  // Product names repeat when a garden lists varieties separately.
  const productNames = [...new Set(garden.products.map((p) => p.name))]

  React.useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.focus()
    // Caret at the end of the suggestion, ready to add to it.
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
  }, [])

  async function send() {
    if (!canSend) return

    setSending(true)
    try {
      const conversation = await startConversation({
        gardenId: garden.id,
        body: message.trim(),
        ...(product ? { productName: product } : {}),
      })
      toast.success(t("sent", { name: garden.owner.name }))
      onSent(conversation)
    } catch (error) {
      console.error(error)
      toast.error(t(sendErrorKey(error)))
      setSending(false)
    }
  }

  return (
    <form
      aria-labelledby={titleId}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void send()
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={titleId} className="font-medium">
          {t("composerTitle", { name: garden.owner.name })}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-mr-1"
          onClick={onCancel}
          disabled={sending}
        >
          <XIcon />
          <span className="sr-only">{t("cancel")}</span>
        </Button>
      </div>

      {productNames.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">{t("interestedIn")}</span>
          <div
            role="group"
            aria-label={t("interestedIn")}
            className="flex flex-wrap gap-1.5"
          >
            {productNames.map((productName) => {
              const selected = product === productName
              return (
                <Button
                  key={productName}
                  type="button"
                  size="xs"
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  className="rounded-full"
                  onClick={() => setProduct(selected ? null : productName)}
                >
                  {selected && <CheckIcon data-icon="inline-start" />}
                  {productName}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter adds a line; Cmd/Ctrl+Enter sends.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              void send()
            }
          }}
          aria-label={t("messageLabel")}
          aria-invalid={tooLong || undefined}
          className="max-h-48 min-h-24"
          disabled={sending}
        />
        {message.length > COUNTER_THRESHOLD && (
          <span
            className={cn(
              "self-end text-xs text-muted-foreground tabular-nums",
              tooLong && "text-destructive"
            )}
          >
            {message.length}/{MESSAGE_MAX_LENGTH}
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={sending}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={!canSend}>
          {sending ? (
            <Spinner data-icon="inline-start" aria-hidden />
          ) : (
            <SendIcon data-icon="inline-start" />
          )}
          {sending ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  )
}

function sendErrorKey(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "errorSignIn"
    if (error.code === "GARDEN_NOT_FOUND") return "errorUnavailable"
    if (error.code === "GARDEN_HAS_NO_OWNER") return "errorNoOwner"
    if (error.code === "CANNOT_CONTACT_OWN_GARDEN") return "errorOwnGarden"
  }
  return "errorGeneric"
}
