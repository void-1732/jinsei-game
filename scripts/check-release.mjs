/** STEP 58: final release gate for public documentation, integrity and versions. */
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
function verify(condition,message){if(!condition)throw Error('正式版公開検査: '+message);}
const pkg=JSON.parse(read('package.json'));
const version='6.0.0';
verify(pkg.version===version,'package.jsonのバージョンが一致しません');
const html=read('index.html'),app=read('js/app.js');
verify(html.includes('v'+version)&&html.includes('第58段階'),'画面の版数が一致しません');
verify(app.includes('v'+version),'アプリ内の版数が一致しません');
verify(html.includes('lang="ja"')&&html.includes('id="story-dialog"'),'日本語の操作画面が見つかりません');
verify(app.includes('acknowledgeNotifications()'),'イベント通知の一括確認が欠落しています');
const required=['README.md','操作説明書.md','CHANGELOG.md','docs/implementation/PHASE-57-REPORT.md','docs/implementation/PHASE-58-REPORT.md','scripts/qa-browser.mjs','tests/phase55.test.js','tests/phase58.test.js'];
for(const path of required)verify(existsSync(resolve(root,path)),`必須ファイルがありません: ${path}`);
const docs=['README.md','操作説明書.md','CHANGELOG.md','docs/implementation/PHASE-58-REPORT.md'];
for(const path of docs){
 const source=read(path);
 for(const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
  const link=match[1].split('#')[0];
  if(!link||/^(https?:|mailto:)/.test(link))continue;
  verify(existsSync(resolve(root,dirname(path),decodeURIComponent(link))),`リンク切れ: ${path} -> ${link}`);
 }
}
verify(read('README.md').includes('正式版')&&read('README.md').includes('GitHub Pages'),'READMEに正式版の説明がありません');
verify(read('操作説明書.md').includes('1ターン')&&read('操作説明書.md').includes('JSON'),'操作説明書に基本操作・保存の説明がありません');
verify(read('CHANGELOG.md').includes('v'+version)&&read('CHANGELOG.md').includes('STEP 57'),'更新履歴が不足しています');
verify(read('js/core/saveSystems.js').includes('s.schemaVersion!==7'),'保存互換性の識別子が変わっています');
const workflow=read('.github/workflows/pages.yml');
for(const command of ['npm test','scripts/qa-browser.mjs','scripts/check-pages.mjs','scripts/check-release.mjs'])verify(workflow.includes(command),`公開前テスト工程が不足: ${command}`);
console.log(`PASS 正式版公開ゲート v${version}: 説明書・履歴・画面版数・リンク・保存形式・Actions検査`);