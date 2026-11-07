export async function api<T>(
  path: string,
  body?: unknown,
  retry = true,
): Promise<T> {
  const response = await fetch(
    `/api/${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (response.status === 401 && path !== "session" && retry) {
    await api("session", {}, false);
    return api<T>(path, body, false);
  }
  const data = await response.json();
  if (!response.ok)
    throw new Error([data.error, ...(data.details || [])].join("\n"));
  return data as T;
}
