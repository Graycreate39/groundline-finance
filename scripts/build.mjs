import fs from 'node:fs';
fs.rmSync('dist',{recursive:true,force:true});
for(const dir of ['dist/src','dist/src/data','dist/docs','dist/screenshots'])fs.mkdirSync(dir,{recursive:true});
for(const file of ['index.html','src/app.mjs','src/styles.css','src/engine.mjs','src/data/demo.mjs'])fs.copyFileSync(file,`dist/${file}`);
for(const dir of ['docs','screenshots'])fs.cpSync(dir,`dist/${dir}`,{recursive:true});
console.info('Built browser assets to dist/. Run the application through the local Node server.');
