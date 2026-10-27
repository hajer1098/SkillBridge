import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = {...process.env};
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || env[match[1]] !== undefined) continue;
    env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
const jar = path.join(root, "target", "skillbridge-api-1.0.0.jar");
if (!fs.existsSync(jar)) {
  console.error("Build the API first, from SkillBridge-backend: mvn package");
  process.exit(1);
}
const java = env.JAVA_HOME ? path.join(env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java") : "java";
const child = spawn(java, ["-jar", jar], {cwd: root, env, stdio:"inherit", windowsHide:true});
child.on("error", error => { console.error("Could not start Java:", error.message); process.exitCode=1; });
child.on("exit", code => { process.exitCode=code ?? 1; });
for (const signal of ["SIGINT","SIGTERM"]) process.on(signal, () => child.kill(signal));
