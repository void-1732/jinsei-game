/** STEP 50: data-only backups that can be moved to another browser/device. */
import {checksum,validateGameState} from './saveSystems.js';

export const PORTABLE_FORMAT = 'jinsei-game-save';
export const PORTABLE_VERSION = 1;
export const MAX_PORTABLE_CHARS = 8_000_000;

export function serializePortableSave(state, exportedAt = new Date().toISOString()) {
  if (!validateGameState(state) || !state.initialized) return {ok:false,reason:'人生を開始してからバックアップしてください。'};
  if (typeof exportedAt !== 'string' || !Number.isFinite(Date.parse(exportedAt))) return {ok:false,reason:'保存日時が不正です。'};
  const payload = JSON.stringify(state);
  const document = JSON.stringify({format:PORTABLE_FORMAT,version:PORTABLE_VERSION,exportedAt,
    player:state.player.name,gameYear:state.timeline.year,checksum:checksum(payload),payload});
  if (document.length > MAX_PORTABLE_CHARS) return {ok:false,reason:'保存データが大きすぎるため書き出せません。'};
  return {ok:true,text:document};
}

export function parsePortableSave(text) {
  if (typeof text !== 'string' || text.length > MAX_PORTABLE_CHARS) return {ok:false,reason:'保存ファイルが大きすぎます。'};
  let envelope;
  try { envelope = JSON.parse(text); } catch { return {ok:false,reason:'JSONファイルを読み取れません。'}; }
  if (!envelope || envelope.format !== PORTABLE_FORMAT || envelope.version !== PORTABLE_VERSION)
    return {ok:false,reason:'このゲームのバックアップファイルではないか、未対応の形式です。'};
  if (typeof envelope.payload !== 'string' || !/^[0-9a-f]{8}$/.test(envelope.checksum) || checksum(envelope.payload) !== envelope.checksum)
    return {ok:false,reason:'保存ファイルが破損しているか、内容が変更されています。'};
  try {
    const state=JSON.parse(envelope.payload);
    if(!validateGameState(state)||!state.initialized)return {ok:false,reason:'保存データの内容が不正です。'};
    return {ok:true,state,exportedAt:envelope.exportedAt??null};
  } catch { return {ok:false,reason:'保存データの内容を読み取れません。'}; }
}
