'use strict';
// Minimal fake of the `vscode` API: just enough to load and toggle Super Suite modules under node.
const Module = require('module');

function createVscode(initialConfig = {}) {
  const config = { ...initialConfig };
  const commands = new Map();
  const views = new Map();
  const listeners = [];
  const messages = [];
  const disposable = (fn) => ({ dispose: fn });

  const vscode = {
    __config: config, __commands: commands, __views: views, __messages: messages,
    Disposable: { from: (...ds) => disposable(() => ds.forEach((d) => d.dispose())) },
    EventEmitter: class { constructor() { this.event = () => disposable(() => {}); } fire() {} },
    TreeItem: class { constructor(label, state) { this.label = label; this.collapsibleState = state; } },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    ThemeIcon: class { constructor(id) { this.id = id; } },
    ProgressLocation: { Window: 10 },
    ConfigurationTarget: { Global: 1 },
    Uri: { file: (p) => ({ scheme: 'file', fsPath: p }) },
    commands: {
      registerCommand(id, fn) {
        if (commands.has(id)) throw new Error(`command '${id}' already exists`);
        commands.set(id, fn);
        return disposable(() => commands.delete(id));
      },
      executeCommand: async () => {},
    },
    window: {
      registerWebviewViewProvider(id, p) { views.set(id, p); return disposable(() => views.delete(id)); },
      createTreeView(id, o) { views.set(id, o); return disposable(() => views.delete(id)); },
      showErrorMessage: async (m) => { messages.push(['error', m]); },
      showInformationMessage: async (m) => { messages.push(['info', m]); },
      showWarningMessage: async (m) => { messages.push(['warn', m]); },
      setStatusBarMessage() {},
      withProgress: (_o, task) => task(),
      showQuickPick: async () => undefined,
    },
    workspace: {
      workspaceFolders: undefined,
      getConfiguration(section) {
        const prefix = section ? section + '.' : '';
        return {
          get: (k, d) => (prefix + k in config ? config[prefix + k] : d),
          update: async (k, v) => {
            config[prefix + k] = v;
            listeners.forEach((l) => l({ affectsConfiguration: (s) => (prefix + k).startsWith(s) }));
          },
        };
      },
      onDidChangeConfiguration(l) { listeners.push(l); return disposable(() => listeners.splice(listeners.indexOf(l), 1)); },
    },
  };
  return vscode;
}

/** Install the fake as require('vscode') and return it. */
function install(initialConfig) {
  const vscode = createVscode(initialConfig);
  // Drop cached suite modules so they bind to this fresh mock.
  const root = require('path').resolve(__dirname, '..') + require('path').sep;
  for (const k of Object.keys(require.cache)) {
    if (k.startsWith(root) && !k.includes('node_modules') && !k.startsWith(__dirname)) delete require.cache[k];
  }
  const orig = Module._load;
  Module._load = function (request, ...rest) {
    return request === 'vscode' ? vscode : orig.call(this, request, ...rest);
  };
  vscode.__uninstall = () => { Module._load = orig; };
  return vscode;
}

module.exports = { install };
