import fs from 'node:fs';
const files=['index.html','tokens.css','src/app.mjs','src/styles.css','src/engine.mjs','server/server.mjs','server/providers/sec.mjs','server/providers/public-web.mjs'];
for(const file of files)if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
for(const file of files.filter(file=>file.endsWith('.mjs'))){const text=fs.readFileSync(file,'utf8');if(/console\.log|TODO/.test(text))throw new Error(`Quality marker in ${file}`);if(/Arcwell|Northstar|Nimbus Systems/.test(text))throw new Error(`Fictional demo data reached production code in ${file}`);}
const app=fs.readFileSync('src/app.mjs','utf8');
for(const requirement of ['Open research file','User-entered','Material gaps','Updated'])if(!app.includes(requirement))throw new Error(`Research-first UI is missing: ${requirement}`);
console.info('Static quality checks passed');
