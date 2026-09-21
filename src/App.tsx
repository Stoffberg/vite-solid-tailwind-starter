import { For, Show, createEffect, createMemo, createSignal, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import ActionButtons from "./components/ActionButtons";
import { createWelcomeMessage, mockAssistant } from "./mockAssistant";
import type { AttachedFile, ChatAction, ChatMessage } from "./types";

interface ChatState {
  messages: ChatMessage[];
  attachedFile: AttachedFile | null;
  busy: boolean;
}

const STARTERS = [
  "Schedule a meeting",
  "Read the uploaded file",
  "What times work?",
];

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const [state, setState] = createStore<ChatState>({
    messages: [createWelcomeMessage()],
    attachedFile: null,
    busy: false,
  });
  const [draft, setDraft] = createSignal("");
  let listRef: HTMLDivElement | undefined;
  let fileInput: HTMLInputElement | undefined;
  let pendingFileMessageId: string | null = null;

  const showStarters = createMemo(
    () => state.messages.length === 1 && !state.busy
  );

  const consumeActions = (messageId: string) => {
    setState(
      "messages",
      (message) => message.id === messageId,
      "actionsConsumed",
      true
    );
  };

  const consumeAllActions = () => {
    setState("messages", (messages) =>
      messages.map((message) =>
        message.actions?.length ? { ...message, actionsConsumed: true } : message
      )
    );
  };

  const actionsAreLive = (message: ChatMessage, index: number) => {
    if (!message.actions?.length || message.actionsConsumed) return false;
    return !state.messages.slice(index + 1).some((item) => item.role === "user");
  };

  const sendUserMessage = async (text: string) => {
    const content = text.trim();
    if (!content || state.busy) return;

    consumeAllActions();
    const userMessage: ChatMessage = {
      id: uid("u"),
      role: "user",
      content,
      createdAt: Date.now(),
    };

    setState("messages", (messages) => [...messages, userMessage]);
    setDraft("");
    setState("busy", true);

    await sleep(520 + Math.random() * 420);

    const reply = mockAssistant(content, {
      hasFile: Boolean(state.attachedFile),
      fileName: state.attachedFile?.name ?? null,
      messages: state.messages,
    });

    const assistantMessage: ChatMessage = {
      id: uid("a"),
      role: "assistant",
      content: reply.content,
      actions: reply.actions,
      createdAt: Date.now(),
    };

    setState("messages", (messages) => [...messages, assistantMessage]);
    setState("busy", false);
  };

  const handleAction = (message: ChatMessage, action: ChatAction) => {
    if (state.busy) return;

    if (action.kind === "file") {
      pendingFileMessageId = message.id;
      fileInput?.click();
      return;
    }

    consumeActions(message.id);
    void sendUserMessage(action.send ?? action.label);
  };

  const handleFileChange = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      pendingFileMessageId = null;
      return;
    }

    if (pendingFileMessageId) {
      consumeActions(pendingFileMessageId);
      pendingFileMessageId = null;
    }

    setState("attachedFile", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    void sendUserMessage(`I've attached the file to this message (${file.name}).`);
  };

  const resetChat = () => {
    pendingFileMessageId = null;
    setState({
      messages: [createWelcomeMessage()],
      attachedFile: null,
      busy: false,
    });
    setDraft("");
  };

  createEffect(() => {
    state.messages.length;
    state.busy;
    queueMicrotask(() => {
      listRef?.scrollTo({ top: listRef.scrollHeight, behavior: "smooth" });
    });
  });

  onMount(() => {
    listRef?.scrollTo({ top: listRef.scrollHeight });
  });

  return (
    <div class="flex min-h-screen items-center justify-center px-3 py-6 sm:px-6">
      <div class="flex w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <header class="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
              Local mock
            </p>
            <h1 class="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Action Buttons Chat Demo
            </h1>
            <p class="mt-1 text-sm text-slate-400">
              Confirm, choose, or attach a file — no API keys.
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"
            onClick={resetChat}
          >
            Reset
          </button>
        </header>

        <div
          ref={listRef}
          class="chat-scroll flex max-h-[min(68vh,640px)] min-h-[420px] flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6"
        >
          <For each={state.messages}>
            {(message, index) => (
              <article
                class={`rise-in flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  class={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "rounded-br-md bg-indigo-500 text-white"
                      : "rounded-bl-md border border-white/10 bg-slate-900/90 text-slate-100"
                  }`}
                >
                  <p class="whitespace-pre-wrap">{message.content}</p>
                  <Show when={message.role === "assistant" && message.actions}>
                    <ActionButtons
                      actions={message.actions ?? []}
                      disabled={!actionsAreLive(message, index()) || state.busy}
                      onAction={(action) => handleAction(message, action)}
                    />
                  </Show>
                </div>
              </article>
            )}
          </For>

          <Show when={state.busy}>
            <div class="rise-in flex justify-start">
              <div class="rounded-2xl rounded-bl-md border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-slate-400">
                <span class="inline-flex gap-1">
                  <span class="animate-pulse">●</span>
                  <span class="animate-pulse [animation-delay:120ms]">●</span>
                  <span class="animate-pulse [animation-delay:240ms]">●</span>
                </span>
              </div>
            </div>
          </Show>
        </div>

        <Show when={showStarters()}>
          <div class="flex flex-wrap gap-2 px-4 pb-2 sm:px-6">
            <For each={STARTERS}>
              {(starter) => (
                <button
                  type="button"
                  class="rounded-full border border-dashed border-white/15 px-3 py-1 text-xs text-slate-300 hover:border-indigo-300/50 hover:text-white"
                  onClick={() => void sendUserMessage(starter)}
                >
                  {starter}
                </button>
              )}
            </For>
          </div>
        </Show>

        <Show when={state.attachedFile}>
          <div class="px-4 pb-2 sm:px-6">
            <div class="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
              <span class="font-medium">{state.attachedFile?.name}</span>
              <span class="text-cyan-200/70">
                {formatBytes(state.attachedFile?.size ?? 0)}
              </span>
            </div>
          </div>
        </Show>

        <form
          class="border-t border-white/10 p-3 sm:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void sendUserMessage(draft());
          }}
        >
          <div class="flex items-end gap-2 rounded-2xl border border-white/10 bg-slate-900/80 p-2">
            <label class="sr-only" for="chat-input">
              Message
            </label>
            <textarea
              id="chat-input"
              rows={1}
              value={draft()}
              disabled={state.busy}
              placeholder="Write a message…"
              class="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
              onInput={(event) => setDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendUserMessage(draft());
                }
              }}
            />
            <button
              type="submit"
              disabled={state.busy || !draft().trim()}
              class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M3.4 20.6L21 12 3.4 3.4l.1 6.8L15 12 3.5 13.8z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      <input
        ref={fileInput}
        type="file"
        class="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
