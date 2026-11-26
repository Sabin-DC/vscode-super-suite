# Adding a module

Every feature in Super Suite is a self-contained **module** with its own folder, its own on/off switch and its own settings sheet.

## Naming scheme
For a module called `My Thing`:

| Thing | Name |
|---|---|
| Folder | `src/modules/my-thing/` |
| Module id (camelCase) | `myThing` |
| Toggle setting | `superSuite.myThing.enabled` |
| Other settings | `superSuite.myThing.<setting>` |
| Commands | `superSuite.myThing.<command>` |
| View / container ids | `superSuite.myThing.<view>` / `superSuiteMyThing` |
| Global state keys | `superSuite.myThing.<key>` |
| Storage folder | `<globalStorage>/my-thing/` |

## Steps
1. Create `src/modules/my-thing/` with:
   - `index.js` exporting `{ id: 'myThing', label: 'My Thing', activate(context) }`. `activate` must register everything and return a `vscode.Disposable` (use `vscode.Disposable.from(...)`). The registry calls `dispose()` when the user switches the module off, so nothing may leak.
   - `module.json`: a manifest fragment with the module's `commands`, `menus`, `views`, etc. and one `configuration` object (the module's settings sheet) that includes `superSuite.myThing.enabled` (default `true`).
   - `README.md`.
2. Gate every view and menu entry with `config.superSuite.myThing.enabled` in its `when` clause (and hide palette commands the same way), so the UI disappears when the module is off.
3. Add `require('./my-thing')` to `src/modules/index.js`.
4. Run `npm run build:manifest` to merge the fragment into `package.json`, then `npm test`. The tests fail if the manifest is stale, the toggle is missing, something isn't gated, or declared commands don't match registered ones.

Modules must not require each other; shared helpers go in `src/core/`.
