import fs from "node:fs";
import assert from "node:assert/strict";

const source = new URL("../src/main/resources/development-seed.json", import.meta.url);
const seed = JSON.parse(fs.readFileSync(source, "utf8"));
for (const collection of ["courses", "projects", "mentors"]) {
  assert.ok(Array.isArray(seed[collection]) && seed[collection].length, `${collection} must be a nonempty array`);
  const ids = new Set();
  for (const item of seed[collection]) {
    assert.ok(Number.isInteger(item.id) && item.id > 0 && !ids.has(item.id), `Invalid or duplicate ${collection} ID`);
    ids.add(item.id);
    assert.ok(Array.isArray(item.skills) && item.skills.every(skill => typeof skill === "string"), `Invalid ${collection} skills`);
    if (collection === "mentors") assert.ok(item.name && item.email && item.email.includes("@"), "Mentor accounts need a name and email");
    else assert.ok(item.title && item.category && item.level && item.hours > 0, `Invalid ${collection} content`);
    if (collection === "courses") assert.ok(Array.isArray(item.lessons) && item.lessons.length, "Courses need lessons");
  }
}
assert.ok(Array.isArray(seed.skillOptions) && seed.skillOptions.every(skill => typeof skill === "string"));
console.log(`Seed valid: ${seed.courses.length} courses, ${seed.projects.length} projects, ${seed.mentors.length} mentors.`);
