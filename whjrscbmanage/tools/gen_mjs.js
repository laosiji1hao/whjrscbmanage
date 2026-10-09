/* 用全局 esbuild 把 pages/*.jsx 编译成 .mjs（交付三件套之一） */
const fs = require('fs'); const path = require('path');
const { execSync } = require('child_process');
const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
const esbuild = require(path.join(globalRoot, 'esbuild'));
const dir = path.join(__dirname, '..', 'pages');
fs.readdirSync(dir).filter(f => f.endsWith('.jsx')).forEach(f => {
  const name = f.slice(0, -4);
  esbuild.buildSync({ entryPoints: [path.join(dir, f)], outfile: path.join(dir, name + '.mjs'),
    format: 'iife', charset: 'utf8', bundle: true, logLevel: 'silent' });
  console.log('ok ' + name + '.mjs');
});
