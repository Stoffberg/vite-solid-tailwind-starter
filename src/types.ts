export type ActionKind = "send" | "file";

export interface ChatAction {
  id: string;
  label: string;
  kind: ActionKind;
  send?: string;
}

export interface AttachedFile {
  name: string;
  size: number;
  type: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
  actionsConsumed?: boolean;
  createdAt: number;
}

export interface AssistantReply {
  content: string;
  actions?: ChatAction[];
}

export interface MockContext {
  hasFile: boolean;
  fileName: string | null;
  messages: ChatMessage[];
}
