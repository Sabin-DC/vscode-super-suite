'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { compareFolders } = require('../src/modules/folder-compare/lib/compare');
const { compile, entryLine } = require('../src/modules/folder-compare/lib/ignore');

function tree(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true });
    fs.writeFileSync(path.join(d, rel), content);
  }
  return d;
}

test('compareFolders finds modified, left-only and right-only files', async () => {
  const l = tree({ 'a.txt': '1', 'b.txt': 'same', 'sub/c.txt': 'L', '.git/x': 'ignored' });
  const r = tree({ 'a.txt': '2', 'b.txt': 'same', 'sub/d.txt': 'R' });
  const res = await compareFolders(l, r, ['.git']);
  assert.deepStrictEqual(res.modified.map((e) => e.rel), ['a.txt']);
  assert.deepStrictEqual(res.leftOnly.map((e) => e.rel), ['sub/c.txt']);
  assert.deepStrictEqual(res.rightOnly.map((e) => e.rel), ['sub/d.txt']);
  assert.strictEqual(res.identical, 1);
});

test('ignoreLineEndings treats CRLF and BOM differences as identical', async () => {
  const l = tree({ 'a.txt': 'x\r\ny\r\n' });
  const r = tree({ 'a.txt': '﻿x\ny\n' });
  assert.strictEqual((await compareFolders(l, r, [], { ignoreLineEndings: true })).modified.length, 0);
  assert.strictEqual((await compareFolders(l, r, [], { ignoreLineEndings: false })).modified.length, 1);
});

test('global ignore list patterns', () => {
  const ig = compile('# c\n*.log\nbuild/\n/src/gen.js\n**/*.min.js\n');
  assert.ok(ig('a/b/x.log'));
  assert.ok(ig('build', true) && !ig('build', false));
  assert.ok(ig('src/gen.js') && !ig('other/src/gen.js'));
  assert.ok(ig('deep/er/app.min.js'));
  assert.ok(!ig('keep.js'));
  assert.ok(compile(entryLine('we*ird?.txt'))('we*ird?.txt'));
});
