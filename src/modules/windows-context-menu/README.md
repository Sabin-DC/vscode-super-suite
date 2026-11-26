# Windows Context Menu

Module id: `windowsContextMenu` · Toggle: `superSuite.windowsContextMenu.enabled` · Commands: `superSuite.windowsContextMenu.*`

Shows the real Windows Explorer context menu (Open with, Send to, Properties, Copy as path, and entries added by installed apps such as 7-Zip or Git) for files and folders in VS Code.

## Use
Right-click a file or folder in the Explorer (or an editor tab, the editor, or Source Control) and choose **Windows Context Menu...** at the bottom. The native menu opens at the mouse pointer. Multi-select works for items in the same folder.

You can also run **Windows Context Menu: Active File** from the Command Palette and bind it to a key.

## Why not Shift + right-click?
VS Code extensions cannot see mouse clicks or modifier keys, and menu `when` clauses cannot test for Shift, so a Shift+right-click trigger isn't possible through the extension API. Regular right-click keeps the normal VS Code menu, and this module adds one entry to it.

## Settings (Settings UI → "Super Suite: Windows Context Menu")
- `superSuite.windowsContextMenu.enabled` (default on): turn the whole module on/off. The menu entries only appear on Windows regardless.
- `superSuite.windowsContextMenu.extendedItems` (default on): include the entries Windows normally shows only with Shift held.

## How it works
On first use the module compiles `native/ShellMenu.cs` with the .NET Framework `csc.exe` that ships with Windows and caches the result in `<globalStorage>/windows-context-menu/`. The helper asks the Windows shell for the item's context menu and shows it. No downloads are needed.

Windows only. In remote windows (SSH/WSL/containers) paths belong to the remote machine, so the menu only works for local files.
