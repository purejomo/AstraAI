import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prepareLicenses } from "./prepare-licenses.mjs";
const root = process.cwd();
const output = path.join(root, ".desktop/server");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, ".next/standalone"), output, {
  recursive: true,
  filter: (source) =>
    ![".local", ".env"].includes(path.basename(source)) &&
    !path.basename(source).startsWith(".env."),
});
await cp(path.join(root, ".next/static"), path.join(output, ".next/static"), {
  recursive: true,
});
await mkdir(path.join(output, "prompts"), { recursive: true });
await cp(
  path.join(root, "prompts/GENERATE_STUDY_PACK.md"),
  path.join(output, "prompts/GENERATE_STUDY_PACK.md"),
);
await prepareLicenses(root, output);
// Generate native app icons from the repository's existing vector icon.
const png = await sharp(path.join(root, "src/app/icon.svg"))
  .resize(256, 256)
  .png()
  .toBuffer();
await mkdir("desktop/assets", { recursive: true });
await writeFile("desktop/assets/icon.png", png);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile("desktop/assets/icon.ico", Buffer.concat([header, png]));
const app = JSON.parse(await readFile("desktop/package.json", "utf8"));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
if (app.version !== pkg.version)
  throw new Error("Root and desktop package versions must match.");
console.log(
  `Prepared AstraAI ${pkg.version} with its local server and runtime assets.`,
);
