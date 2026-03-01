import { describe, expect, test } from "bun:test";
import { serializeGraphSnapshot } from "../src/cli/serializeGraphSnapshot";
import type { GraphSnapshot } from "../src/GraphSnapshot";
import type { TaskDescriptor } from "../src/TaskDescriptor";

describe("serializeGraphSnapshot", () => {
  test("produces JSON-safe output with stable agent summaries", () => {
    const cyclicTable: any = {};
    const column: any = { table: cyclicTable };
    cyclicTable.columns = { id: column };

    const sharedAgent = {
      settings: {
        model: { modelId: "model-x" },
        tools: { search: {}, write: {} },
      },
      generate: () => Promise.resolve("ok"),
    };

    const baseTask: Omit<TaskDescriptor, "nodeId" | "ordinal" | "agent"> = {
      iteration: 0,
      outputTable: cyclicTable,
      outputTableName: "table_a",
      needsApproval: false,
      skipIf: false,
      retries: 0,
      timeoutMs: null,
      continueOnFail: false,
    };

    const tasks: TaskDescriptor[] = [
      {
        ...baseTask,
        nodeId: "task-a",
        ordinal: 0,
        agent: sharedAgent,
        prompt: "hello",
        staticPayload: { ok: true },
        label: "Task A",
        meta: { tag: "alpha" },
      },
      {
        ...baseTask,
        nodeId: "task-b",
        ordinal: 1,
        agent: sharedAgent,
        computeFn: () => "computed",
      },
    ];

    const snapshot: GraphSnapshot = {
      runId: "run-1",
      frameNo: 0,
      xml: null,
      tasks,
    };

    const serialized = serializeGraphSnapshot(snapshot);

    expect(() => JSON.stringify(serialized)).not.toThrow();
    const json = JSON.parse(JSON.stringify(serialized));

    expect(json.runId).toBe("run-1");
    expect(json.tasks).toHaveLength(2);
    expect(json.tasks[0].outputTableName).toBe("table_a");

    expect(json.tasks[0].agent).toBeDefined();
    expect(json.tasks[1].agent).toBeDefined();
    expect(json.tasks[0].agent).toEqual(json.tasks[1].agent);

    const tools = [...json.tasks[0].agent.tools].sort();
    expect(tools).toEqual(["search", "write"]);
    expect(json.tasks[0].agent.model).toBe("model-x");

    expect("outputTable" in json.tasks[0]).toBe(false);
    expect("outputSchema" in json.tasks[0]).toBe(false);
    expect("computeFn" in json.tasks[0]).toBe(false);
  });
});
