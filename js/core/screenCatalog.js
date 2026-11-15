/**
 * PHASE 1 screen catalogue.  The legacy registry is deliberately treated as
 * read-only input: all 55 IDs and titles remain defined in screenRegistry.js.
 */
import { screenGroups as legacyGroups } from './screenRegistry.js';

const legacyScreens = legacyGroups.flatMap(group => group.screens);
export const LEGACY_SCREEN_IDS = Object.freeze(legacyScreens.map(screen => screen.id));

const educationScreens = Object.freeze([
  { id: 'EDU-01', title: '学業ダッシュボード' },
  { id: 'EDU-02', title: '学校・在学状況' },
  { id: 'EDU-03', title: '学習・成績' },
  { id: 'EDU-04', title: '受験・進学' },
  { id: 'EDU-05', title: '資格・スキル' },
  { id: 'EDU-06', title: '学業履歴' },
]);
export const ACADEMIC_SCREEN_IDS = Object.freeze(educationScreens.map(screen => screen.id));

const originalById = new Map(legacyScreens.map(screen => [screen.id, screen]));
const academicById = new Map(educationScreens.map(screen => [screen.id, screen]));
const screenFromId = id => originalById.get(id) ?? academicById.get(id);

// The category assignments are presentation-only; screen IDs are not renamed.
// EVENT screens stay with 人生; LIFE-02..08 are organized under 生活・資産.
const categories = [
  ['人生', ['LIFE-01', ...Array.from({ length: 6 }, (_, i) => `EVENT-${String(i + 1).padStart(2, '0')}`)], 'OV'],
  ['生活・資産', Array.from({ length: 7 }, (_, i) => `LIFE-${String(i + 2).padStart(2, '0')}`), 'LS'],
  ['人物・家族', Array.from({ length: 7 }, (_, i) => `PERSON-${String(i + 1).padStart(2, '0')}`), 'PE'],
  ['学業', ACADEMIC_SCREEN_IDS, 'ED'],
  ['仕事・経営', Array.from({ length: 5 }, (_, i) => `WORK-${String(i + 1).padStart(2, '0')}`), 'WK'],
  ['健康', Array.from({ length: 8 }, (_, i) => `HEALTH-${String(i + 1).padStart(2, '0')}`), 'HL'],
  ['社会', Array.from({ length: 8 }, (_, i) => `SOCIETY-${String(i + 1).padStart(2, '0')}`), 'SO'],
  ['履歴', Array.from({ length: 7 }, (_, i) => `HISTORY-${String(i + 1).padStart(2, '0')}`), 'HI'],
  ['設定', Array.from({ length: 6 }, (_, i) => `SETTING-${String(i + 1).padStart(2, '0')}`), 'ST'],
];

export const screenGroups = Object.freeze(categories.map(([category, ids, symbol]) => Object.freeze({
  category,
  symbol,
  screens: Object.freeze(ids.map(id => {
    const original = screenFromId(id);
    if (!original) throw new Error(`未定義の画面ID: ${id}`);
    return Object.freeze({ id: original.id, title: original.title, category });
  })),
})));
export const allScreens = Object.freeze(screenGroups.flatMap(group => group.screens));
export const CATEGORY_NAMES = Object.freeze(screenGroups.map(group => group.category));
const catalogById = new Map(allScreens.map(screen => [screen.id, screen]));
export const findScreen = id => catalogById.get(id) ?? null;

export function assertCatalogIntegrity() {
  const ids = allScreens.map(screen => screen.id);
  const unique = new Set(ids);
  if (legacyScreens.length !== 55 || educationScreens.length !== 6 || ids.length !== 61) {
    throw new Error('画面数が仕様（既存55＋学業6＝61）と一致しません');
  }
  if (screenGroups.length !== 9 || unique.size !== ids.length) {
    throw new Error('カテゴリ数または画面IDの一意性に問題があります');
  }
  for (const legacy of legacyScreens) {
    const mapped = findScreen(legacy.id);
    if (!mapped || mapped.title !== legacy.title) throw new Error(`既存画面が変更されました: ${legacy.id}`);
  }
  for (const academic of educationScreens) {
    if (!findScreen(academic.id)) throw new Error(`学業画面の登録漏れ: ${academic.id}`);
  }
  return true;
}
assertCatalogIntegrity();
