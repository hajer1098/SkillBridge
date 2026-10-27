import ts from "typescript";
import fs from "node:fs";
const source = fs.readFileSync(
  new URL("../src/data.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const data = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
fs.writeFileSync(
  new URL(
    "../backend/src/main/resources/development-seed.json",
    import.meta.url,
  ),
  JSON.stringify(
    {
      courses: data.courses,
      mentors: data.mentors,
      projects: data.projects,
      initialState: data.initialState,
    },
    null,
    2,
  ) + "\n",
);
console.log("Development catalog exported.");
