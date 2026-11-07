import { createReadStream } from "node:fs";
import { open, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";

const manifest = JSON.parse(
  await readFile(new URL("../distribution.json", import.meta.url), "utf8"),
);
const installer = new URL(`../../${manifest.file}`, import.meta.url);
const handle = await open(installer, "r");
try {
  const header = Buffer.alloc(2);
  await handle.read(header, 0, 2, 0);
  if (header.toString() !== "MZ")
    throw new Error(
      "The installer is missing. Run git lfs pull from the repository root.",
    );
} finally {
  await handle.close();
}
if ((await stat(installer)).size !== manifest.bytes)
  throw new Error("Installer size does not match distribution.json.");
const hash = createHash("sha256");
for await (const chunk of createReadStream(installer)) hash.update(chunk);
if (hash.digest("hex") !== manifest.sha256)
  throw new Error("Installer SHA-256 does not match distribution.json.");
console.log(
  `Verified ${manifest.file}: Windows x64, v${manifest.version}, ${manifest.bytes} bytes.`,
);
