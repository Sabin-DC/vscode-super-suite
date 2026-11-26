# Folder Compare

Module id: `folderCompare` · Toggle: `superSuite.folderCompare.enabled` · Commands/views: `superSuite.folderCompare.*`

Create as many one-click buttons as you like in the sidebar. Each button has a **name** and two **folders**; clicking it compares them and lists every difference, and clicking a file in the list opens VS Code's built-in diff editor.

## Use
1. Click the **Folder Compare** icon in the Activity Bar.
2. **+ New comparison button**: enter a name, pick (or type) the left and right folders, **Create button**.
3. Click the button. Results appear under **Results**:
   - **Modified**: opens a side-by-side diff
   - **Only in left / Only in right**: opens that file
4. **Edit** / **Delete** under each button change it later.

Paths accept `${workspaceFolder}` and `~`.

## Global ignore list
In **Results**, select one or more files (Ctrl/Cmd-click or Shift-click), right-click, and choose **Add to Global Ignore List**. They disappear from the results and are skipped by every button from then on. Edit the list with the pencil icon in Results or the **Edit global ignore list** link in the sidebar. It is a plain text file, one pattern per line (`*`, `**`, `?`, `build/`, `#` comments).

## Settings (Settings UI → "Super Suite: Folder Compare")
- `superSuite.folderCompare.enabled` (default on): turn the whole module on/off.
- `superSuite.folderCompare.ignoreLineEndings` (default on): files that differ only by CRLF/LF line endings or a UTF-8 BOM count as identical. Only content is compared, never dates or metadata.
- `superSuite.folderCompare.ignore`: names skipped at any depth (default `.git`, `node_modules`, `.DS_Store`).

## Storage
Buttons are stored per-user in VS Code's global state (key `superSuite.folderCompare.buttons`). The ignore list lives in `<globalStorage>/folder-compare/ignore.txt`.

## Files
| File | Purpose |
|---|---|
| `index.js` | module entry: registers view, commands |
| `buttonsView.js` | sidebar webview with the buttons |
| `resultsProvider.js` | the Results tree |
| `runComparison.js` | runs one comparison |
| `ignoreStore.js` | global ignore file |
| `lib/compare.js`, `lib/ignore.js` | pure Node logic (no `vscode` dependency) |
| `module.json` | manifest fragment (commands, views, menus, settings sheet) |
