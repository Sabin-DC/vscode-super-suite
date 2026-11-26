'use strict';
// The list of Super Suite modules. To add a feature: create src/modules/<name>/ (see docs/ADDING_A_MODULE.md)
// and add one line here. Each module exports { id, label, activate(context) -> Disposable }.
module.exports = [
  require('./folder-compare'),
  require('./windows-context-menu'),
];
