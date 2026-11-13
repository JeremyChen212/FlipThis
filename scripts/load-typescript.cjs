const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function loader() {
  const cache = new Map();
  return function load(file) {
    const full = path.resolve(file);
    if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} };
    cache.set(full, module);
    const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
    }).outputText;
    vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: full })(name => {
      if (name.endsWith('.json')) return require(path.resolve(path.dirname(full), name));
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      if (name.startsWith('.')) return load(path.resolve(path.dirname(full), name + '.ts'));
      return require(name);
    }, module, module.exports);
    return module.exports;
  };
}

module.exports = loader;
