import type { AssistantReply, ChatAction, ChatMessage, MockContext } from "./types";

let actionSeq = 0;

function action(
  label: string,
  kind: ChatAction["kind"] = "send",
  send?: string
): ChatAction {
  actionSeq += 1;
  return {
    id: `act-${actionSeq}`,
    label,
    kind,
    ...(send ? { send } : {}),
  };
}

function lastAssistant(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "assistant") return messages[i];
  }
  return undefined;
}

function lastUserBeforeLatest(messages: ChatMessage[]): ChatMessage | undefined {
  let seenLatestUser = false;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role !== "user") continue;
    if (!seenLatestUser) {
      seenLatestUser = true;
      continue;
    }
    return messages[i];
  }
  return undefined;
}

function labelsOf(message?: ChatMessage): string[] {
  return (message?.actions ?? []).map((item) =>
    (item.send ?? item.label).toLowerCase()
  );
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function isAffirmative(text: string): boolean {
  return /^(yes|yeah|yep|yup|sure|ok|okay|please do|do it|confirm|go ahead|y)$/i.test(
    text.trim()
  );
}

function isNegative(text: string): boolean {
  return /^(no|nope|nah|cancel|don't|do not|not now|n)$/i.test(text.trim());
}

export function createWelcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    createdAt: Date.now(),
    content:
      "Hi — this is Action Buttons Chat. Assistant replies can attach buttons for a real next step: confirm, pick an option, or open a file picker. These are not suggested follow-up prompts.\n\nTry “Schedule a meeting”, “Read the uploaded file”, or “What times work?”",
  };
}

export function mockAssistant(userText: string, ctx: MockContext): AssistantReply {
  const text = normalize(userText);
  const prior = lastAssistant(ctx.messages);
  const priorLabels = labelsOf(prior);
  const priorHadConfirm =
    priorLabels.includes("yes") &&
    (priorLabels.includes("no") || priorLabels.includes("cancel"));
  const priorHadSlots = priorLabels.some((label) =>
    ["morning", "afternoon", "evening"].includes(label)
  );
  const attachedNow =
    /i'?ve attached the file to this message/i.test(userText) ||
    /^attached:\s+/i.test(userText);

  if (attachedNow) {
    const name = ctx.fileName ?? "your file";
    return {
      content: `Got it — ${name} is attached on this side now. I can summarize it whenever you ask.`,
    };
  }

  if (
    (/(read|summarize|open|analyse|analyze|look at).*(file|document|upload|pdf|attachment)/.test(
      text
    ) ||
      /(uploaded file|my file|the file)/.test(text)) &&
    ctx.hasFile &&
    ctx.fileName
  ) {
    return {
      content: `Mock summary of ${ctx.fileName}: a short local preview. In a real app this is where the model would read the bytes you just attached.`,
    };
  }

  if (
    /(read|summarize|open|analyse|analyze|look at).*(file|document|upload|pdf|attachment)/.test(
      text
    ) ||
    /(uploaded file|attach(ed)? file|choose a file|upload (a |the )?file)/.test(text)
  ) {
    return {
      content:
        "I do not see a file on this chat yet. Use the button below to pick one — I will attach it and continue in the same step.",
      actions: [action("Choose file", "file")],
    };
  }

  if (priorHadSlots) {
    if (/morning/.test(text)) {
      return {
        content:
          "Booked for tomorrow morning. I will hold 09:00–09:30. Want me to send a calendar invite?",
        actions: [action("Yes", "send", "Yes"), action("No", "send", "No")],
      };
    }
    if (/afternoon/.test(text)) {
      return {
        content:
          "Booked for tomorrow afternoon. I will hold 14:00–14:30. Want me to send a calendar invite?",
        actions: [action("Yes", "send", "Yes"), action("No", "send", "No")],
      };
    }
    if (/evening/.test(text)) {
      return {
        content:
          "Booked for tomorrow evening. I will hold 17:30–18:00. Want me to send a calendar invite?",
        actions: [action("Yes", "send", "Yes"), action("No", "send", "No")],
      };
    }
    if (isNegative(userText) || /cancel/.test(text)) {
      return {
        content: "No slot booked. Say if you want to try another time.",
      };
    }
  }

  if (priorHadConfirm && isAffirmative(userText)) {
    const priorText = prior?.content.toLowerCase() ?? "";
    if (/calendar invite|invite/.test(priorText)) {
      return {
        content: "Invite queued (demo). You would get a calendar file here in a real product.",
      };
    }
    return {
      content: "Which slot should I book?",
      actions: [
        action("Morning", "send", "Morning"),
        action("Afternoon", "send", "Afternoon"),
        action("Cancel", "send", "Cancel"),
      ],
    };
  }

  if (priorHadConfirm && isNegative(userText)) {
    return {
      content: "Okay — I will leave it. Ask again if you want it scheduled.",
    };
  }

  if (
    /(schedule|book|meeting|appointment|call|calendar|hold a slot)/.test(text) ||
    text === "book it"
  ) {
    return {
      content:
        "I can put a 30-minute meeting on tomorrow’s calendar. Would you like me to schedule it for you?",
      actions: [action("Yes", "send", "Yes"), action("No", "send", "No")],
    };
  }

  if (/(time|slot|morning|afternoon|evening|when can|available|availability)/.test(text)) {
    return {
      content: "These slots are open tomorrow. Pick one and I will hold it.",
      actions: [
        action("Morning", "send", "Morning"),
        action("Afternoon", "send", "Afternoon"),
        action("Evening", "send", "Evening"),
      ],
    };
  }

  if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(text)) {
    return {
      content:
        "Hello. I can schedule a meeting, offer time slots, or help you attach a file. What do you want to do?",
      actions: [
        action("Schedule it", "send", "Schedule a meeting"),
        action("Pick a time", "send", "What times work?"),
      ],
    };
  }

  if (/help|what can you|how (does|do) (this|it)/.test(text)) {
    return {
      content:
        "Buttons under my messages run an action: Yes/No confirms, the chips pick a slot, and the file button opens the system picker then sends an attach message for you.",
    };
  }

  if (/thank/.test(text)) {
    return {
      content: "You are welcome. Want me to schedule a follow-up?",
      actions: [action("Yes", "send", "Yes"), action("No", "send", "No")],
    };
  }

  const previousUser = lastUserBeforeLatest(ctx.messages);
  const talkingAboutFile =
    previousUser &&
    /(file|document|upload|pdf)/.test(previousUser.content.toLowerCase());

  if (talkingAboutFile && !ctx.hasFile && /(where|missing|none|don't|attach)/.test(text)) {
    return {
      content: "Still no file here. The button opens the native picker and attaches it in one step.",
      actions: [action("Upload file", "file")],
    };
  }

  if (/(please|can you|could you|need you to|go ahead)/.test(text)) {
    return {
      content: "I can take that as a request to schedule a short meeting. Confirm and I will continue.",
      actions: [action("Yes", "send", "Yes"), action("No", "send", "No")],
    };
  }

  return {
    content:
      "Noted. I can schedule a meeting, offer time slots, or attach a file if you need me to read one. Should I schedule a follow-up?",
    actions: [action("Yes", "send", "Yes"), action("No", "send", "No")],
  };
}

