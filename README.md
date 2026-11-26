# vscode-super-suite

Personal suite of VS Code tools in one extension. Every feature is a separate **module** that can be switched on or off on its own from Settings (no reload needed), and each has its own settings sheet.

| Module | Folder | Toggle | What it does |
|---|---|---|---|
| [Folder Compare](src/modules/folder-compare/README.md) | `src/modules/folder-compare` | `superSuite.folderCompare.enabled` | Sidebar buttons that each compare two folders and open VS Code's diff editor |
| [Windows Context Menu](src/modules/windows-context-menu/README.md) | `src/modules/windows-context-menu` | `superSuite.windowsContextMenu.enabled` | Native Windows Explorer right-click menu inside VS Code (Windows only) |

Toggle modules in **Settings → Extensions → Super Suite: …**, or run **Super Suite: Enable / Disable Modules...** from the Command Palette.

## Layout
```
extension.js              entry point, hands off to the module registry
src/core/                 registry (live on/off), core manifest fragment
src/modules/<name>/       one folder per feature: index.js, module.json, README.md, ...
scripts/build-manifest.js merges every module.json into package.json "contributes"
test/                     node:test suite (uses a mock of the vscode API)
docs/ADDING_A_MODULE.md   naming scheme and steps for new modules
```

## Develop
- Press **F5** (Run Extension) to launch a development host.
- After editing any `module.json`: `npm run build:manifest`.
- `npm test` runs the tests (Node 20+, no dependencies).
- Package: `npx @vscode/vsce package`, then **Install from VSIX...**

See [docs/ADDING_A_MODULE.md](docs/ADDING_A_MODULE.md) to add a feature.
