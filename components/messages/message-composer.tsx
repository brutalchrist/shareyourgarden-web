"use client"

import * as React from "react"
import { ArrowUpIcon, MapPinIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { MESSAGE_MAX_LENGTH } from "@/lib/conversations"
import { cn } from "@/lib/utils"

// The character counter only shows up close to the limit.
const COUNTER_THRESHOLD = 1800

// On touch screens Enter adds a line, like in most messaging apps; with a
// keyboard it sends and Shift+Enter adds a line.
function prefersEnterToSend() {
  return window.matchMedia("(pointer: fine)").matches
}

export function MessageComposer({
  onSend,
  canShareLocation = false,
}: {
  onSend: (body: string, shareLocation: boolean) => void
  // The garden's owner can attach its exact location to a message.
  canShareLocation?: boolean
}) {
  const t = useTranslations("Messages")
  const [body, setBody] = React.useState("")
  const [shareLocation, setShareLocation] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const tooLong = body.length > MESSAGE_MAX_LENGTH
  const canSend = body.trim().length > 0 && !tooLong

  React.useEffect(() => {
    // Ready to type when a conversation opens, except on touch screens where
    // it would pop the keyboard over the thread.
    if (prefersEnterToSend()) textareaRef.current?.focus()
  }, [])

  function submit() {
    if (!canSend) return
    onSend(body.trim(), canShareLocation && shareLocation)
    setBody("")
    // Sharing is a choice made for each message.
    setShareLocation(false)
    textareaRef.current?.focus()
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="flex flex-col gap-1"
    >
      <InputGroup>
        <InputGroupTextarea
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              prefersEnterToSend()
            ) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder={t("composerPlaceholder")}
          aria-label={t("composerLabel")}
          aria-invalid={tooLong || undefined}
          rows={1}
          className="max-h-40 min-h-10"
        />
        {canShareLocation && (
          <InputGroupAddon align="inline-start" className="self-end pb-1.5">
            <InputGroupButton
              type="button"
              variant={shareLocation ? "secondary" : "ghost"}
              size="icon-sm"
              aria-pressed={shareLocation}
              onClick={() => setShareLocation((current) => !current)}
            >
              <MapPinIcon />
              <span className="sr-only">{t("shareLocation")}</span>
            </InputGroupButton>
          </InputGroupAddon>
        )}
        <InputGroupAddon align="inline-end" className="self-end pb-1.5">
          <InputGroupButton
            type="submit"
            variant="default"
            size="icon-sm"
            disabled={!canSend}
          >
            <ArrowUpIcon />
            <span className="sr-only">{t("send")}</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        {shareLocation && (
          <span className="text-foreground">{t("shareLocationActive")}</span>
        )}
        <span className="max-md:hidden">
          {t.rich("sendHint", {
            kbd: (chunks) => <Kbd>{chunks}</Kbd>,
          })}
        </span>
        {body.length > COUNTER_THRESHOLD && (
          <span
            className={cn(
              "ml-auto tabular-nums",
              tooLong && "text-destructive"
            )}
          >
            {body.length}/{MESSAGE_MAX_LENGTH}
          </span>
        )}
      </div>
    </form>
  )
}
