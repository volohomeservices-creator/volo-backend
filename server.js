// Root entry point for Hostinger Node.js Application Manager
// 1. Shim server-only globally so pure Node.js runtime never throws Client Component error
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return originalRequire.apply(this, [id, ...args]);
};

// 2. Load the production compiled Express backend server
require('./dist/server.js');
