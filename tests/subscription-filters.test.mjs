import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// The route now delegates to the subscription module. Exercise its actual helpers.
const source = readFileSync(new URL('../components/modules/SubscriptionManagement.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('subscription.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const snippets = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['normalizeSubscriptionValue', 'shiftDateByDays'].includes(node.name?.text)) snippets.push(node.getText(ast));
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'duplicateGroups') {
    snippets.push(`function findDuplicateGroups(scopedSubscriptions) { return (${node.initializer.arguments[0].getText(ast)})(); }`);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const compiled = ts.transpileModule(snippets.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const context = vm.createContext({});
vm.runInContext(`${compiled}\nglobalThis.api = { findDuplicateGroups, shiftDateByDays };`, context);
const { findDuplicateGroups, shiftDateByDays } = context.api;

test('duplicate subscriptions use normalized name and account, falling back to site', () => {
  const result = findDuplicateGroups([
    { id: '1', name: 'Netflix', account: 'a@example.test' },
    { id: '2', name: ' netflix ', account: 'A@Example.test' },
    { id: '3', name: 'Netflix', account: 'other@example.test' },
    { id: '4', name: 'Spotify', site: 'https://spotify.test' },
    { id: '5', name: 'Spotify', site: 'https://spotify.test' },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)).map(group => group.map(row => row.id)), [['1', '2'], ['4', '5']]);
});
test('date shortcuts preserve month rollover and invalid input', () => {
  assert.equal(shiftDateByDays('2026-03-15', -15), '2026-02-28');
  assert.equal(shiftDateByDays('2026-01-31', 30), '2026-03-02');
  assert.equal(shiftDateByDays('not a date', 30), 'not a date');
});
