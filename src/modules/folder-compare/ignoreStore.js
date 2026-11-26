'use strict';
// Folder Compare: the global ignore list, a plain text file in the extension's global storage.
const fs = require('fs');
const path = require('path');

const IGNORE_HEADER =
  '# Folder Compare global ignore list (applies to every button).\n' +
  '# One pattern per line, paths relative to the compared folders. Supports * ** ? and a trailing / for folders.\n' +
  '# Examples:  /src/generated.js    *.log    build/    **/*.min.js\n';

function createIgnoreStore(file) {
  const ensure = () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, IGNORE_HEADER);
  };
  return {
    file,
    ensure,
    load() {
      try {
        ensure();
        return fs.readFileSync(file, 'utf8');
      } catch {
        return '';
      }
    },
    /** Append lines (skipping ones already present). Returns how many were added. */
    append(lines) {
      const existing = this.load();
      const have = new Set(existing.split(/\r?\n/).map((l) => l.trim()));
      const fresh = [...new Set(lines)].filter((l) => !have.has(l));
      if (fresh.length) {
        const sep = existing === '' || existing.endsWith('\n') ? '' : '\n';
        fs.appendFileSync(file, sep + fresh.join('\n') + '\n');
      }
      return fresh.length;
    },
  };
}

module.exports = { createIgnoreStore };
