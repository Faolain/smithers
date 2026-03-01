import type { GraphSnapshot } from "../GraphSnapshot";
import type { TaskDescriptor } from "../TaskDescriptor";

export type SerializedAgentSummary = {
  model: string;
  tools: string[];
};

export type SerializedTaskDescriptor = {
  nodeId: string;
  ordinal: number;
  iteration: number;
  ralphId?: string;
  worktreeId?: string;
  worktreePath?: string;
  worktreeBranch?: string;
  outputTableName: string;
  parallelGroupId?: string;
  parallelMaxConcurrency?: number;
  needsApproval: boolean;
  skipIf: boolean;
  retries: number;
  timeoutMs: number | null;
  continueOnFail: boolean;
  agent?: SerializedAgentSummary | SerializedAgentSummary[];
  prompt?: string;
  staticPayload?: unknown;
  label?: string;
  meta?: Record<string, unknown>;
};

export type SerializedGraphSnapshot = {
  runId: string;
  frameNo: number;
  xml: GraphSnapshot["xml"];
  tasks: SerializedTaskDescriptor[];
};

type AgentLike = {
  settings?: {
    model?: unknown;
    tools?: unknown;
  };
  model?: unknown;
  opts?: { model?: unknown };
  tools?: unknown;
};

export function serializeGraphSnapshot(
  snapshot: GraphSnapshot,
): SerializedGraphSnapshot {
  return {
    runId: snapshot.runId,
    frameNo: snapshot.frameNo,
    xml: snapshot.xml,
    tasks: snapshot.tasks.map(serializeTaskDescriptor),
  };
}

function serializeTaskDescriptor(task: TaskDescriptor): SerializedTaskDescriptor {
  return {
    nodeId: task.nodeId,
    ordinal: task.ordinal,
    iteration: task.iteration,
    ralphId: task.ralphId,
    worktreeId: task.worktreeId,
    worktreePath: task.worktreePath,
    worktreeBranch: task.worktreeBranch,
    outputTableName: task.outputTableName,
    parallelGroupId: task.parallelGroupId,
    parallelMaxConcurrency: task.parallelMaxConcurrency,
    needsApproval: task.needsApproval,
    skipIf: task.skipIf,
    retries: task.retries,
    timeoutMs: task.timeoutMs,
    continueOnFail: task.continueOnFail,
    agent: summarizeAgent(task.agent),
    prompt: task.prompt,
    staticPayload: task.staticPayload,
    label: task.label,
    meta: task.meta,
  };
}

function summarizeAgent(
  agent: TaskDescriptor["agent"],
): SerializedAgentSummary | SerializedAgentSummary[] | undefined {
  if (!agent) return undefined;
  if (Array.isArray(agent)) {
    return agent.map((entry) => summarizeSingleAgent(entry as AgentLike));
  }
  return summarizeSingleAgent(agent as AgentLike);
}

function summarizeSingleAgent(agent: AgentLike): SerializedAgentSummary {
  return {
    model: resolveModel(agent) ?? "unknown",
    tools: resolveTools(agent),
  };
}

function resolveModel(agent: AgentLike): string | undefined {
  const candidate =
    agent?.settings?.model && typeof agent.settings.model === "object"
      ? (agent.settings.model as any).modelId ??
        (agent.settings.model as any).id ??
        (agent.settings.model as any).name
      : agent?.settings?.model;
  if (typeof candidate === "string") return candidate;
  if (typeof agent?.model === "string") return agent.model;
  if (typeof agent?.opts?.model === "string") return agent.opts.model;
  return undefined;
}

function resolveTools(agent: AgentLike): string[] {
  const tools = agent?.settings?.tools ?? agent?.tools ?? {};
  if (Array.isArray(tools)) return tools.map((tool) => String(tool));
  if (tools && typeof tools === "object") return Object.keys(tools as object);
  return [];
}
