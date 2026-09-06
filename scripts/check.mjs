import fs from 'node:fs';
const files=['index.html','src/app.mjs','src/styles.css','src/engine.mjs','server/server.mjs','server/store.mjs','server/model.mjs','server/providers/sec.mjs'];
for(const file of files){if(!fs.existsSync(file))throw new Error(`Missing ${file}`);const text=fs.readFileSync(file,'utf8');if(/console\.log|TODO/.test(text))throw new Error(`Quality marker in ${file}`)}
const html=fs.readFileSync('index.html','utf8');if(!html.includes('./src/app.mjs')||!html.includes('./src/styles.css'))throw new Error('Entrypoint assets must be relative.');
console.info('Static quality checks passed');
