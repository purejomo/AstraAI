import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export async function prepareLicenses(root, serverDirectory) {
  const target = path.join(root, ".desktop/licenses");
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  const projectLicense = path.join(root, "../LICENSE");
  await cp(projectLicense, path.join(root, "desktop/LICENSE"));
  await cp(projectLicense, path.join(target, "AstraAI-LICENSE.txt"));
  const notices = [
    "AstraAI third-party notices",
    "Third-party components retain their own licenses.",
    "Electron and Chromium notices are also installed as LICENSE.electron.txt and LICENSES.chromium.html beside AstraAI.exe.",
    "",
  ];
  let copied = 0;
  async function copyNotices(source, destination) {
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const from = path.join(source, entry.name);
      const to = path.join(destination, entry.name);
      if (entry.isDirectory()) await copyNotices(from, to);
      else if (
        /^(licen[cs]es?|notice|copying|copyright)([.-]|$)|\.licen[cs]e(\.|$)/i.test(
          entry.name,
        )
      ) {
        await mkdir(path.dirname(to), { recursive: true });
        await cp(from, to);
        copied++;
      }
    }
  }
  // Only packages actually traced into the server are included. Walking each
  // source package also retains notices for its bundled/vendor components.
  async function packages(directory) {
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      (error) => {
        if (error.code === "ENOENT") return [];
        throw error;
      },
    );
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const bundled = path.join(directory, entry.name);
      if (entry.name.startsWith("@")) {
        await packages(bundled);
        continue;
      }
      const relative = path.relative(serverDirectory, bundled);
      const source = path.join(root, relative);
      const pkg = JSON.parse(
        await readFile(path.join(source, "package.json"), "utf8"),
      );
      const before = copied;
      await copyNotices(source, path.join(target, "third-party", relative));
      const packageTarget = path.join(target, "third-party", relative);
      await mkdir(packageTarget, { recursive: true });
      for (const file of ["package.json", "README.md", "versions.json"]) {
        await cp(path.join(source, file), path.join(packageTarget, file)).catch(
          (error) => {
            if (error.code !== "ENOENT") throw error;
          },
        );
      }
      const shared = {
        "@next/env": "next/license.md",
        "client-only": "react/LICENSE",
      }[pkg.name];
      if (shared) {
        await cp(
          path.join(root, "node_modules", shared),
          path.join(packageTarget, "LICENSE"),
        );
        copied++;
      }
      notices.push(
        `${pkg.name}@${pkg.version}: ${pkg.license || "See bundled notices"} (${copied - before} notice files)`,
      );
      await packages(path.join(bundled, "node_modules"));
    }
  }
  await packages(path.join(serverDirectory, "node_modules"));
  await cp(
    path.join(root, "licenses"),
    path.join(target, "third-party", "license-texts"),
    { recursive: true },
  );
  if (!copied) throw new Error("No third-party license files were bundled.");
  await writeFile(
    path.join(target, "THIRD_PARTY_NOTICES.txt"),
    notices.join("\n") + "\n",
  );
  console.log(
    `Bundled project license and ${copied} third-party notice files.`,
  );
}
