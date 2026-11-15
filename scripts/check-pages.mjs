import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const assets=[...html.matchAll(/(?:src|href)=["'](\.?\/?(?:js|css)\/[^"']+)["']/g)].map(m=>m[1]);
for(const asset of assets){const full=resolve(root,asset);if(!full.startsWith(root+'/')||!existsSync(full))throw Error('不足ファイル: '+asset);}
const files=new Set();
function follow(p){if(files.has(p))return;files.add(p);const s=readFileSync(p,'utf8');for(const m of s.matchAll(/(?:import|export)\s+(?:[^'";]*?from\s*)?['"]([^'"]+)['"]/g)){if(m[1].startsWith('.')){const f=resolve(dirname(p),m[1]);if(!existsSync(f))throw Error('参照先がありません: '+f);follow(f);}}}
follow(resolve(root,'js/app.js'));
console.log(`GitHub Pages用ファイル検査成功: ${assets.length}個の画面用ファイル、${files.size}個のJSモジュール`);
