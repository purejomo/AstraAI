import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { State } from "./types";
export const emptyState = (): State => ({
  version: 1,
  packs: [],
  runs: [],
  reviews: [],
  goals: [],
  sessions: [],
  studied: [],
});
export interface Storage {
  transaction<T>(fn: (state: State) => T | Promise<T>): Promise<T>;
}
/** Single-process local demo adapter. All updates are serialized and atomically replaced. */
export class FileStorage implements Storage {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory: string) {}
  transaction<T>(fn: (state: State) => T | Promise<T>): Promise<T> {
    const operation = this.queue.then(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const file = path.join(this.directory, "study.json");
      let state: State;
      try {
        state = JSON.parse(await readFile(file, "utf8"));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        state = emptyState();
      }
      const result = await fn(state);
      const temporary = `${file}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
      await rename(temporary, file);
      return result;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
const globalStore = globalThis as typeof globalThis & {
  astraStore?: FileStorage;
};
export const storage = (globalStore.astraStore ??= new FileStorage(
  process.env.ASTRA_DATA_DIR || path.join(process.cwd(), ".local"),
));
