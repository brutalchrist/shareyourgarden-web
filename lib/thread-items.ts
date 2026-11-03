// Turns a conversation's messages into what the thread renders: day
// separators and messages that know their place in a run of messages from
// the same sender. Kept free of React so it is easy to reason about.

export type DeliveryStatus = "sent" | "sending" | "failed"

export interface ThreadMessage {
  // Server id, or a temporary id while the message is being sent.
  id: string
  // Stable React key: the temporary id of a message sent from this tab, so
  // it is not remounted when the server id arrives.
  key: string
  senderId: string
  body: string
  createdAt: Date
  status: DeliveryStatus
}

export type ThreadItem =
  | { type: "day"; key: string; date: Date }
  | {
      type: "message"
      key: string
      message: ThreadMessage
      mine: boolean
      // First and last message of a run from the same sender.
      firstOfGroup: boolean
      lastOfGroup: boolean
    }

// Messages further apart than this start a new run.
const GROUP_GAP_MS = 5 * 60 * 1000

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function buildThreadItems(
  messages: ThreadMessage[],
  myId: string
): ThreadItem[] {
  const items: ThreadItem[] = []
  const continues = (a: ThreadMessage | undefined, b: ThreadMessage) =>
    !!a &&
    a.senderId === b.senderId &&
    dayKey(a.createdAt) === dayKey(b.createdAt) &&
    b.createdAt.getTime() - a.createdAt.getTime() < GROUP_GAP_MS

  messages.forEach((message, index) => {
    const previous = messages[index - 1]
    const next = messages[index + 1]

    if (!previous || dayKey(previous.createdAt) !== dayKey(message.createdAt)) {
      items.push({
        type: "day",
        key: `day-${dayKey(message.createdAt)}`,
        date: message.createdAt,
      })
    }

    items.push({
      type: "message",
      key: message.key,
      message,
      mine: message.senderId === myId,
      firstOfGroup: !continues(previous, message),
      lastOfGroup: !next || !continues(message, next),
    })
  })

  return items
}
