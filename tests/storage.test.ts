import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { FileStorage } from "../src/lib/storage";
it("serializes concurrent mutations and survives a new adapter instance", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "astra-storage-"));
  try {
    const store = new FileStorage(dir);
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        store.transaction((state) => {
          state.studied.push({
            userId: "one",
            revisionId: "r1",
            conceptId: `c${i}`,
          });
        }),
      ),
    );
    const reloaded = new FileStorage(dir);
    expect(await reloaded.transaction((state) => state.studied.length)).toBe(
      20,
    );
    await expect(
      reloaded.transaction(() => {
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(await reloaded.transaction((state) => state.studied.length)).toBe(
      20,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it("fails safely on corrupted existing storage rather than overwriting it", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "astra-corrupt-"));
  try {
    await writeFile(path.join(dir, "study.json"), "broken");
    await expect(new FileStorage(dir).transaction((s) => s)).rejects.toThrow();
    expect(await readFile(path.join(dir, "study.json"), "utf8")).toBe("broken");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
