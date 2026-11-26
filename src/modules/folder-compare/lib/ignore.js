'use strict';
// Gitignore-style matcher (subset): comments (#), blank lines, *, **, ?, leading "/" to anchor,
// trailing "/" for folders, backslash to escape. No negation.

function globToRegex(p) {
  let out = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '\\' && i + 1 < p.length) {
      out += p[++i].replace(/[.+^${}()|[\]\\*?]/g, '\\$&');
    } else if (c === '*') {
      if (p[i + 1] === '*') {
        if (p[i + 2] === '/') { out += '(?:.*/)?'; i += 2; }
        else { out += '.*'; i += 1; }
      } else out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return out;
}

function compile(text) {
  const rules = [];
  for (let raw of String(text || '').split(/\r?\n/)) {
    let line = raw.replace(/\s+$/, '').replace(/^\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const dirOnly = line.endsWith('/') && !line.endsWith('\\/');
    if (dirOnly) line = line.slice(0, -1);
    const anchored = line.startsWith('/') || line.includes('/');
    if (line.startsWith('/')) line = line.slice(1);
    if (!line) continue;
    const body = globToRegex(line);
    rules.push({ dirOnly, re: new RegExp(anchored ? `^${body}$` : `^(?:.*/)?${body}$`) });
  }
  return (rel, isDir = false) => rules.some((r) => (!r.dirOnly || isDir) && r.re.test(rel));
}

/** Turn a relative path into an anchored, escaped ignore line. */
function entryLine(rel) {
  return '/' + rel.replace(/[\\*?]/g, '\\$&').replace(/^(\/)([#])/, '$1\\$2');
}

module.exports = { compile, entryLine };
