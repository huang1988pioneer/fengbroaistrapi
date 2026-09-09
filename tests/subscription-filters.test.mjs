import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Same trick as image-payload: pull the real helpers out of the route without mounting React.
const source = readFileSync(new URL("../app/routes/_index.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("route.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(["daysFromToday", "normalizeKeyPart", "findDuplicateGroups", "shiftDateByDays"]);
const snippets = [];
function visit(node) {
  if (ts.isVariableStatement(node) && node.declarationList.declarations.some((d) => names.has(d.name.getText(ast)))) snippets.push(node.getText(ast));
  if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) snippets.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const compiled = ts.transpileModule(snippets.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function load() {
  const context = vm.createContext({});
  vm.runInContext(`${compiled}\nglobalThis.api = { daysFromToday, findDuplicateGroups, shiftDateByDays };`, context);
  return context.api;
}

const { daysFromToday, findDuplicateGroups, shiftDateByDays } = load();

// Local calendar day, offset by whole days — never routed through UTC.
function isoDaysFromNow(offset) {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  return utc.toISOString().slice(0, 10);
}

// Values built inside the vm context come from another realm, so assert on
// plain serialized copies rather than tripping deepEqual's prototype check.
const plain = (value) => JSON.parse(JSON.stringify(value));

test("daysFromToday measures whole days from midnight, so today is zero", () => {
  assert.equal(daysFromToday(isoDaysFromNow(0)), 0);
  assert.equal(daysFromToday(isoDaysFromNow(7)), 7);
  assert.equal(daysFromToday(isoDaysFromNow(-3)), -3);
});

test("daysFromToday treats missing and unparseable dates as never due", () => {
  assert.equal(daysFromToday(""), Number.POSITIVE_INFINITY);
  assert.equal(daysFromToday(null), Number.POSITIVE_INFINITY);
  assert.equal(daysFromToday("not a date"), Number.POSITIVE_INFINITY);
});

test("the due buckets split the same way fengbroaiappwrite does", () => {
  const records = [
    { id: "expired", nextdate: isoDaysFromNow(-1) },
    { id: "today", nextdate: isoDaysFromNow(0) },
    { id: "edge", nextdate: isoDaysFromNow(7) },
    { id: "later", nextdate: isoDaysFromNow(8) },
    { id: "blank", nextdate: "" },
  ];
  const expired = records.filter((r) => daysFromToday(r.nextdate) < 0).map((r) => r.id);
  const dueSoon = records
    .filter((r) => {
      const days = daysFromToday(r.nextdate);
      return days >= 0 && days <= 7;
    })
    .map((r) => r.id);
  const noDate = records.filter((r) => !String(r.nextdate ?? "").trim()).map((r) => r.id);

  assert.deepEqual(expired, ["expired"]);
  assert.deepEqual(dueSoon, ["today", "edge"]);
  assert.deepEqual(noDate, ["blank"]);
});

test("duplicates group on name plus account, falling back to site", () => {
  const groups = findDuplicateGroups([
    { id: "1", name: "Netflix", account: "a@example.test" },
    { id: "2", name: " netflix ", account: "A@Example.test" },
    { id: "3", name: "Netflix", account: "other@example.test" },
    { id: "4", name: "Spotify", site: "https://spotify.test" },
    { id: "5", name: "Spotify", site: "https://spotify.test" },
    { id: "6", name: "", account: "a@example.test" },
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(plain(groups).map((group) => group.map((record) => record.id)).sort(), [["1", "2"], ["4", "5"]]);
});

test("a different account keeps same-named subscriptions apart", () => {
  const groups = findDuplicateGroups([
    { id: "1", name: "Netflix", account: "a@example.test" },
    { id: "2", name: "Netflix", account: "b@example.test" },
  ]);
  assert.deepEqual(plain(groups), []);
});

test("shiftDateByDays moves the date and keeps the YYYY-MM-DD shape", () => {
  assert.equal(shiftDateByDays("2026-03-15", 15), "2026-03-30");
  assert.equal(shiftDateByDays("2026-03-15", -15), "2026-02-28");
  assert.equal(shiftDateByDays("2026-01-31", 30), "2026-03-02");
});

test("shiftDateByDays falls back to today when the field is empty", () => {
  assert.equal(shiftDateByDays("", 30), isoDaysFromNow(30));
  assert.equal(shiftDateByDays("not a date", 30), "not a date");
});
