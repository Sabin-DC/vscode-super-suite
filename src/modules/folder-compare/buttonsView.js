'use strict';
// Folder Compare: the sidebar webview that holds the named comparison buttons.
const vscode = require('vscode');
const { newId } = require('./util');

const STORE_KEY = 'superSuite.folderCompare.buttons';

class ButtonsViewProvider {
  constructor(context, runButton) {
    this.context = context;
    this.runButton = runButton;
    this.view = undefined;
  }

  get buttons() {
    return this.context.globalState.get(STORE_KEY, []);
  }
  async saveButtons(list) {
    await this.context.globalState.update(STORE_KEY, list);
    this.postState();
  }
  postState() {
    this.view?.webview.postMessage({ type: 'state', buttons: this.buttons });
  }

  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((m) => this.onMessage(m));
    view.onDidChangeVisibility(() => view.visible && this.postState());
  }

  async onMessage(m) {
    switch (m.type) {
      case 'ready':
        this.postState();
        break;
      case 'save': {
        const name = String(m.name || '').trim();
        const left = String(m.left || '').trim();
        const right = String(m.right || '').trim();
        if (!name || !left || !right) {
          vscode.window.showWarningMessage('Folder Compare: name, left folder and right folder are all required.');
          return;
        }
        const list = [...this.buttons];
        if (m.id) {
          const i = list.findIndex((b) => b.id === m.id);
          if (i >= 0) list[i] = { id: m.id, name, left, right };
        } else {
          list.push({ id: newId(), name, left, right });
        }
        await this.saveButtons(list);
        this.view?.webview.postMessage({ type: 'saved' });
        break;
      }
      case 'delete': {
        const b = this.buttons.find((x) => x.id === m.id);
        if (!b) return;
        const pick = await vscode.window.showWarningMessage(`Delete button "${b.name}"?`, { modal: true }, 'Delete');
        if (pick === 'Delete') await this.saveButtons(this.buttons.filter((x) => x.id !== m.id));
        break;
      }
      case 'browse': {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Select folder',
        });
        if (uris?.[0]) this.view?.webview.postMessage({ type: 'picked', field: m.field, path: uris[0].fsPath });
        break;
      }
      case 'openIgnore':
        vscode.commands.executeCommand('superSuite.folderCompare.openIgnoreFile');
        break;
      case 'run': {
        const b = this.buttons.find((x) => x.id === m.id);
        if (b) await this.runButton(b);
        break;
      }
    }
  }

  html(webview) {
    const nonce = newId() + newId();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    return /* html */ `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { padding: 8px 12px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  button { font-family: inherit; font-size: inherit; cursor: pointer; }
  .primary { width: 100%; padding: 6px 10px; border: 1px solid var(--vscode-button-border, transparent); border-radius: 2px;
             background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .primary:hover { background: var(--vscode-button-hoverBackground); }
  .secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);
               border: 1px solid transparent; border-radius: 2px; padding: 4px 10px; }
  .secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .link { background: none; border: none; color: var(--vscode-textLink-foreground); padding: 2px 4px; }
  .link:hover { text-decoration: underline; }
  .link.danger { color: var(--vscode-errorForeground); }
  .item { margin-bottom: 10px; }
  .item .paths { font-size: 0.85em; opacity: 0.7; margin: 3px 0 0; word-break: break-all; }
  .item .actions { display: flex; gap: 4px; justify-content: flex-end; }
  .empty { opacity: 0.7; margin: 8px 0 12px; }
  #add { margin: 4px 0 12px; }
  form { display: none; border-top: 1px solid var(--vscode-widget-border, #444); padding-top: 10px; margin-top: 6px; }
  form.open { display: block; }
  label { display: block; margin: 8px 0 3px; font-weight: 600; }
  input { width: 100%; box-sizing: border-box; padding: 4px 6px; color: var(--vscode-input-foreground);
          background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); }
  input:focus { outline: 1px solid var(--vscode-focusBorder); }
  .row { display: flex; gap: 4px; }
  .row input { flex: 1; }
  .btns { display: flex; gap: 6px; margin-top: 12px; }
  .hint { font-size: 0.8em; opacity: 0.65; margin-top: 4px; }
</style></head>
<body>
  <button id="add" class="secondary">+ New comparison button</button>
  <div id="list"></div>
  <button id="ign" class="link">Edit global ignore list</button>

  <form id="form">
    <input type="hidden" id="id">
    <label for="name">Button name</label>
    <input id="name" placeholder="e.g. Prod vs Staging config">
    <label for="left">Left folder</label>
    <div class="row"><input id="left" placeholder="/path/to/folder"><button type="button" class="secondary" data-browse="left">Browse</button></div>
    <label for="right">Right folder</label>
    <div class="row"><input id="right" placeholder="/path/to/other/folder"><button type="button" class="secondary" data-browse="right">Browse</button></div>
    <div class="hint">Tip: <code>\${workspaceFolder}</code> and <code>~</code> work in paths.</div>
    <div class="btns">
      <button type="submit" class="primary" id="saveBtn">Save</button>
      <button type="button" class="secondary" id="cancel">Cancel</button>
    </div>
  </form>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  let buttons = [];

  function render() {
    const list = $('list');
    list.textContent = '';
    if (!buttons.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'No buttons yet. Create one to compare two folders with a single click.';
      list.appendChild(p);
      return;
    }
    for (const b of buttons) {
      const item = document.createElement('div');
      item.className = 'item';

      const run = document.createElement('button');
      run.className = 'primary';
      run.textContent = b.name;
      run.title = b.left + '  \\u2194  ' + b.right;
      run.onclick = () => vscode.postMessage({ type: 'run', id: b.id });

      const paths = document.createElement('div');
      paths.className = 'paths';
      paths.textContent = b.left + '  \\u2194  ' + b.right;

      const actions = document.createElement('div');
      actions.className = 'actions';
      const edit = document.createElement('button');
      edit.className = 'link'; edit.textContent = 'Edit';
      edit.onclick = () => openForm(b);
      const del = document.createElement('button');
      del.className = 'link danger'; del.textContent = 'Delete';
      del.onclick = () => vscode.postMessage({ type: 'delete', id: b.id });
      actions.append(edit, del);

      item.append(run, paths, actions);
      list.appendChild(item);
    }
  }

  function openForm(b) {
    $('id').value = b ? b.id : '';
    $('name').value = b ? b.name : '';
    $('left').value = b ? b.left : '';
    $('right').value = b ? b.right : '';
    $('saveBtn').textContent = b ? 'Save changes' : 'Create button';
    $('form').classList.add('open');
    $('add').style.display = 'none';
    $('name').focus();
  }
  function closeForm() {
    $('form').classList.remove('open');
    $('add').style.display = '';
  }

  $('add').onclick = () => openForm(null);
  $('ign').onclick = () => vscode.postMessage({ type: 'openIgnore' });
  $('cancel').onclick = closeForm;
  document.querySelectorAll('[data-browse]').forEach((el) => {
    el.onclick = () => vscode.postMessage({ type: 'browse', field: el.dataset.browse });
  });
  $('form').onsubmit = (e) => {
    e.preventDefault();
    vscode.postMessage({ type: 'save', id: $('id').value || undefined,
      name: $('name').value, left: $('left').value, right: $('right').value });
  };

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'state') { buttons = m.buttons; render(); }
    else if (m.type === 'saved') closeForm();
    else if (m.type === 'picked') $(m.field).value = m.path;
  });

  render();
  vscode.postMessage({ type: 'ready' });
</script>
</body></html>`;
  }
}

module.exports = { ButtonsViewProvider };
