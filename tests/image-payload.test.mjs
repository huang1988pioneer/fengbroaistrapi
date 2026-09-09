import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Exercise the route's real upload callback and serializers without mounting React.
const source = readFileSync(new URL("../app/routes/_index.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("route.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(["imageFields", "fileAssetFields", "uploadMediaFile", "getEmptyDraft", "normalizeDraft", "toStrapiData", "toStrapiFieldValue", "normalizeFileTypeValue"]);
const snippets = [];
function visit(node) {
  if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.has(d.name.getText(ast)))) snippets.push(node.getText(ast));
  if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) snippets.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const compiled = ts.transpileModule(snippets.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test("uploaded image sends file and cover URLs matching the Strapi text schema", async () => {
  const url = "https://example.test/uploads/image.png";
  const context = vm.createContext({
    settings: {}, activeModule: { id: "image" }, mediaUploadRef: { current: null },
    hasStrapiConfig: () => true, setLoading() {}, setToast() {}, getUploadKind: () => "圖片",
    strapiUploadFile: async () => ({ url, hash: "image" }), getStrapiAssetUrl: (_, value) => value,
    normalizeFileType: () => "png", getErrorMessage: error => { throw error; },
  });
  vm.runInContext(compiled + '\nactiveModule.fields = imageFields; let draft = getEmptyDraft(activeModule); function setDraft(update) { draft = update(draft); }', context);
  await vm.runInContext('uploadMediaFile({ name: "image.png" })', context);
  const data = vm.runInContext('toStrapiData(normalizeDraft(draft, activeModule), activeModule)', context);
  assert.equal(data.file, url);
  assert.equal(typeof data.cover, "string");
  assert.equal(data.cover, url);
  vm.runInContext('draft.cover = false', context);
  await vm.runInContext('uploadMediaFile({ name: "replacement.png" })', context);
  assert.equal(vm.runInContext('draft.cover', context), url);
});

test("image form, CSV and API serialization preserve optional cover URLs", () => {
  const context = vm.createContext({});
  vm.runInContext(compiled + '\nconst moduleDef = { fields: imageFields };', context);
  for (const [value, expected] of [["", ""], ["https://example.test/old.png", "https://example.test/old.png"]]) {
    context.value = value;
    assert.equal(vm.runInContext('toStrapiData(normalizeDraft({ cover: value }, moduleDef), moduleDef).cover', context), expected);
    assert.equal(vm.runInContext('toStrapiData({ cover: value }, moduleDef).cover', context), expected);
  }
  assert.equal(vm.runInContext('toStrapiData(getEmptyDraft(moduleDef), moduleDef).cover', context), "");
  assert.equal(vm.runInContext('imageFields.find(field => field.key === "cover").type', context), "url");
  assert.equal(vm.runInContext('fileAssetFields.find(field => field.key === "cover").type', context), "url");
});
