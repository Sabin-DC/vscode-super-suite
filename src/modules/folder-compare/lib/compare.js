'use strict';
// Pure Node folder comparison (no vscode dependency, so it can be tested alone).
const fs = require('fs');
const path = require('path');

async function walk(root, ignore, isIgnored) {
  const files = new Map(); // relative path (posix style) -> { abs, size }
  async function recurse(dir, rel) {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory: skip
    }
    for (const e of entries) {
      if (ignore.has(e.name)) continue;
      const abs = path.join(dir, e.name);
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) {
        if (isIgnored && isIgnored(r, true)) continue;
        await recurse(abs, r);
      } else if (e.isFile()) {
        if (isIgnored && isIgnored(r, false)) continue;
        const st = await fs.promises.stat(abs);
        files.set(r, { abs, size: st.size });
      }
    }
  }
  await recurse(root, '');
  return files;
}

function isText(buf) {
  return !buf.subarray(0, 8000).includes(0); // no NUL bytes => treat as text
}

function normalize(buf) {
  if (!isText(buf)) return buf;
  let str = buf.toString('utf8');
  if (str.charCodeAt(0) === 0xfeff) str = str.slice(1); // strip BOM
  return Buffer.from(str.replace(/\r\n?/g, '\n'), 'utf8'); // CRLF / CR -> LF
}

async function sameContent(a, b, loose) {
  const [ba, bb] = await Promise.all([fs.promises.readFile(a), fs.promises.readFile(b)]);
  if (ba.equals(bb)) return true;
  return loose ? normalize(ba).equals(normalize(bb)) : false;
}

/** Returns { modified: [], leftOnly: [], rightOnly: [], identical: n } with entries { rel, left?, right? } */
async function compareFolders(leftDir, rightDir, ignoreList = [], options = {}) {
  const loose = !!options.ignoreLineEndings;
  const ignore = new Set(ignoreList);
  const isIgnored = options.isIgnored;
  const [left, right] = await Promise.all([walk(leftDir, ignore, isIgnored), walk(rightDir, ignore, isIgnored)]);
  const result = { modified: [], leftOnly: [], rightOnly: [], identical: 0 };

  for (const [rel, l] of left) {
    const r = right.get(rel);
    if (!r) {
      result.leftOnly.push({ rel, left: l.abs });
    } else if ((!loose && l.size !== r.size) || !(await sameContent(l.abs, r.abs, loose))) {
      result.modified.push({ rel, left: l.abs, right: r.abs });
    } else {
      result.identical++;
    }
  }
  for (const [rel, r] of right) {
    if (!left.has(rel)) result.rightOnly.push({ rel, right: r.abs });
  }
  const byRel = (a, b) => a.rel.localeCompare(b.rel);
  result.modified.sort(byRel);
  result.leftOnly.sort(byRel);
  result.rightOnly.sort(byRel);
  return result;
}

module.exports = { compareFolders };
