import fs from 'fs';
const spec = JSON.parse(fs.readFileSync('/home/z/my-project/openapi-schema.json', 'utf8'));

// Extract RPC function definitions from paths
const rpcPaths = Object.keys(spec.paths).filter(p => p.includes('/rpc/'));
console.log('=== RPC FUNCTIONS ===\n');

for (const path of rpcPaths.sort()) {
  const funcName = path.replace('/rpc/', '');
  const methods = Object.keys(spec.paths[path]).filter(m => m !== 'parameters');
  
  for (const method of methods) {
    const op = spec.paths[path][method];
    const params = (op.parameters || []).filter(p => p.in === 'body');
    const bodyDef = params[0]?.schema;
    
    console.log(`${method.toUpperCase()} /rpc/${funcName}`);
    if (bodyDef?.properties) {
      const required = bodyDef.required || [];
      for (const [name, prop] of Object.entries(bodyDef.properties)) {
        const type = prop.type || prop.format || '?';
        const req = required.includes(name) ? 'REQUIRED' : 'OPTIONAL';
        console.log(`  IN  ${name}: ${type} ${req}`);
      }
    } else {
      console.log('  (no parameters)');
    }
    
    // Check response schema
    const resp200 = op.responses?.['200'];
    if (resp200?.schema) {
      const rType = resp200.schema.type || resp200.schema.$ref || 'unknown';
      console.log(`  OUT ${rType}`);
    }
    console.log('');
  }
}

// Check RLS-related info from row level security parameters
console.log('\n=== RLS FILTERED COLUMNS (from OpenAPI parameters) ===\n');
const rlsTables = new Set();
for (const [path, pathObj] of Object.entries(spec.paths)) {
  if (path.includes('/rpc/') || path === '/') continue;
  const tableName = path.replace('/', '');
  for (const method of Object.keys(pathObj)) {
    const params = pathObj[method].parameters || [];
    for (const p of params) {
      if (p.name?.startsWith('rowFilter.')) {
        rlsTables.add(tableName);
        break;
      }
    }
  }
}
console.log('Tables with RLS filters in OpenAPI:');
for (const t of [...rlsTables].sort()) {
  console.log(`  ${t}`);
}

// Also check the parameters section for detailed filter definitions
console.log('\n=== ROW FILTER DETAILS ===\n');
const paramDefs = spec.parameters || {};
const tableFilters = {};
for (const [key, def] of Object.entries(paramDefs)) {
  if (key.startsWith('rowFilter.')) {
    const parts = key.split('.');
    const table = parts[1];
    const col = parts[2];
    if (!tableFilters[table]) tableFilters[table] = [];
    tableFilters[table].push({ col, ...def });
  }
}
for (const [table, filters] of Object.entries(tableFilters).sort()) {
  console.log(`${table}:`);
  for (const f of filters) {
    console.log(`  ${f.col} (${f.type || 'unknown'})`);
  }
}
