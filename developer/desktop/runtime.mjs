import net from "node:net";
import { readFile, writeFile } from "node:fs/promises";

export function sameOrigin(value, origin) {
  try {
    return new URL(value).origin === origin;
  } catch {
    return false;
  }
}

// Keep the origin stable across restarts so browser drafts and cookies survive.
// A collision must fail instead of opening another process's server.
export async function reservePort(configFile) {
  let existing;
  try {
    existing = JSON.parse(await readFile(configFile, "utf8")).port;
    if (!Number.isInteger(existing) || existing < 1024 || existing > 65535)
      throw new Error(
        "앱 통신 설정을 읽을 수 없습니다. 데이터 폴더의 desktop.json을 확인하세요.",
      );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const port = await new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", () =>
      reject(
        new Error(
          "앱 전용 포트가 사용 중입니다. 실행 중인 AstraAI를 종료한 뒤 다시 시도하세요.",
        ),
      ),
    );
    socket.listen(existing || 0, "127.0.0.1", () => {
      const assigned = socket.address().port;
      socket.close((error) => (error ? reject(error) : resolve(assigned)));
    });
  });
  if (!existing)
    await writeFile(configFile, JSON.stringify({ port }), { mode: 0o600 });
  return port;
}

export async function waitForServer(
  origin,
  secret,
  hasExited,
  timeout = 30000,
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (hasExited()) throw new Error("학습실 실행 프로세스가 종료되었습니다.");
    try {
      const response = await fetch(`${origin}/api/desktop/health`, {
        headers: { "X-Astra-Desktop-Token": secret },
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok && (await response.json()).desktop === true) return;
    } catch {
      /* Startup can take a few seconds on a first launch. */
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(
    "학습실 시작 시간이 초과되었습니다. 앱을 닫고 다시 실행해 주세요.",
  );
}
