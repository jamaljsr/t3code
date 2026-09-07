import type {
  ChatAttachment,
  OrchestrationThreadDetailSnapshot,
  OrchestrationThreadStreamItem,
} from "@t3tools/contracts";

// Older clients reject the whole message when an attachment isn't an image.
// Filter only outgoing responses; persisted messages keep every attachment.
function imageAttachments(attachments: ReadonlyArray<ChatAttachment>) {
  return attachments.some((attachment) => attachment.type !== "image")
    ? attachments.filter((attachment) => attachment.type === "image")
    : attachments;
}

export function projectFileAttachmentsSnapshot(
  snapshot: OrchestrationThreadDetailSnapshot,
  supportsFileAttachments: boolean,
): OrchestrationThreadDetailSnapshot {
  if (supportsFileAttachments) return snapshot;
  return {
    ...snapshot,
    thread: {
      ...snapshot.thread,
      messages: snapshot.thread.messages.map((message) =>
        message.attachments
          ? { ...message, attachments: imageAttachments(message.attachments) }
          : message,
      ),
    },
  };
}

export function projectFileAttachmentsStreamItem(
  item: OrchestrationThreadStreamItem,
  supportsFileAttachments: boolean,
): OrchestrationThreadStreamItem {
  if (supportsFileAttachments) return item;
  if (item.kind === "snapshot") {
    return { ...item, snapshot: projectFileAttachmentsSnapshot(item.snapshot, false) };
  }
  if (item.kind !== "event" || item.event.type !== "thread.message-sent") return item;
  const attachments = item.event.payload.attachments;
  if (!attachments) return item;
  return {
    ...item,
    event: {
      ...item.event,
      payload: { ...item.event.payload, attachments: imageAttachments(attachments) },
    },
  };
}
