import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { reservePort, sameOrigin, waitForServer } from "../desktop/runtime.mjs";
import { handle } from "../src/lib/api";
import { emptyState, type Storage } from "../src/lib/storage";
afterEach(() => vi.unstubAllEnvs());
it("keeps the desktop port stable and refuses to open a port used by another process", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "astra-port-"));
  const occupied = net.createServer();
  try {
    const file = path.join(directory, "desktop.json");
    const port = await reservePort(file);
    expect(await reservePort(file)).toBe(port);
    await new Promise<void>((resolve) =>
      occupied.listen(port, "127.0.0.1", resolve),
    );
    await expect(reservePort(file)).rejects.toThrow("포트가 사용 중");
    expect(JSON.parse(await readFile(file, "utf8")).port).toBe(port);
  } finally {
    if (occupied.listening)
      await new Promise<void>((resolve) => occupied.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
it("accepts only its own exact origin for navigation and runtime headers", () => {
  const origin = "http://127.0.0.1:43123";
  expect(sameOrigin(`${origin}/api/bootstrap`, origin)).toBe(true);
  for (const url of [
    "https://example.com",
    "file:///tmp/a",
    "http://127.0.0.1:43124",
    "http://127.0.0.1.evil.test:43123",
    "javascript:alert(1)",
  ])
    expect(sameOrigin(url, origin)).toBe(false);
});
it("detects an exited server instead of waiting or opening an unrelated page", async () => {
  await expect(
    waitForServer("http://127.0.0.1:1", "secret", () => true, 100),
  ).rejects.toThrow("종료");
});
it("requires the per-launch desktop secret and exposes no storage via health checks", async () => {
  vi.stubEnv("ASTRA_DESKTOP_TOKEN", "test-only-secret");
  const db: Storage = {
    transaction: (fn) => Promise.resolve(fn(emptyState())),
  };
  const request = (route: string, token?: string) =>
    new Request(`http://127.0.0.1:43123/api/${route}`, {
      headers: token ? { "x-astra-desktop-token": token } : {},
    });
  expect((await handle(request("bootstrap"), db)).status).toBe(403);
  expect((await handle(request("desktop/health", "wrong"), db)).status).toBe(
    403,
  );
  const health = await handle(
    request("desktop/health", "test-only-secret"),
    db,
  );
  expect(await health.json()).toEqual({ desktop: true });
  const data = await (
    await handle(request("bootstrap", "test-only-secret"), db)
  ).json();
  expect(data.storageMode).toBe("desktop");
  expect(data.user).toBeNull();
});
