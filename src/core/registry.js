'use strict';
// Starts/stops modules according to their `superSuite.<id>.enabled` setting, live (no reload needed).
const vscode = require('vscode');

const SECTION = 'superSuite';

function isEnabled(mod) {
  return vscode.workspace.getConfiguration(SECTION).get(`${mod.id}.enabled`, true);
}

function createRegistry(context, modules) {
  const running = new Map(); // module id -> Disposable

  function start(mod) {
    try {
      running.set(mod.id, mod.activate(context));
    } catch (err) {
      vscode.window.showErrorMessage(`Super Suite: failed to start "${mod.label}": ${err.message}`);
      console.error(`[super-suite] ${mod.id} failed to start`, err);
    }
  }

  function stop(mod) {
    const d = running.get(mod.id);
    running.delete(mod.id);
    try {
      d?.dispose();
    } catch (err) {
      console.error(`[super-suite] ${mod.id} failed to stop`, err);
    }
  }

  /** Bring running modules in line with the current settings. */
  function sync() {
    for (const mod of modules) {
      const want = isEnabled(mod);
      const has = running.has(mod.id);
      if (want && !has) start(mod);
      else if (!want && has) stop(mod);
    }
  }

  async function manage() {
    const cfg = vscode.workspace.getConfiguration(SECTION);
    const picks = await vscode.window.showQuickPick(
      modules.map((m) => ({ label: m.label, picked: isEnabled(m), mod: m })),
      { canPickMany: true, title: 'Super Suite modules', placeHolder: 'Tick the modules you want enabled' }
    );
    if (!picks) return;
    const chosen = new Set(picks.map((p) => p.mod.id));
    for (const m of modules) {
      const on = chosen.has(m.id);
      if (on !== isEnabled(m)) await cfg.update(`${m.id}.enabled`, on, vscode.ConfigurationTarget.Global);
    }
  }

  return {
    running,
    sync,
    manage,
    dispose() {
      for (const mod of modules) if (running.has(mod.id)) stop(mod);
    },
  };
}

module.exports = { createRegistry, SECTION };
