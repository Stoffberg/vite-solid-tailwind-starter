import { For, Show } from "solid-js";
import type { ChatAction } from "../types";

interface ActionButtonsProps {
  actions: ChatAction[];
  disabled: boolean;
  onAction: (action: ChatAction) => void;
}

function PaperclipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      class="h-4 w-4"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21.44 11.05l-8.49 8.49a5.25 5.25 0 01-7.43-7.43l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a1.75 1.75 0 01-2.47-2.47l8.13-8.13" />
    </svg>
  );
}

function actionClass(action: ChatAction, disabled: boolean, index: number): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-40";

  if (action.kind === "file") {
    return `${base} border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 focus-visible:ring-cyan-300`;
  }

  if (index === 0 && !/cancel|no/i.test(action.label)) {
    return `${base} bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:ring-indigo-300`;
  }

  return `${base} border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 focus-visible:ring-slate-300`;
}

export default function ActionButtons(props: ActionButtonsProps) {
  return (
    <Show when={props.actions.length > 0}>
      <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Assistant actions">
        <For each={props.actions}>
          {(action, index) => (
            <button
              type="button"
              class={actionClass(action, props.disabled, index())}
              disabled={props.disabled}
              onClick={() => props.onAction(action)}
            >
              <Show when={action.kind === "file"}>
                <PaperclipIcon />
              </Show>
              {action.label}
            </button>
          )}
        </For>
      </div>
    </Show>
  );
}
