// mtc.js
require('dotenv').config();

const {
  reserveManyParallel,
} = require('./reserve-core');

// ============================
// 設定ゾーン（ここだけいじればOK）
// ============================

// 基本パターン：時間・コートID
// ★ ここを変えれば「日曜17時」などにも流用できる
const BASE_PATTERN = {
  hour: 17,      // ← ここを 17 にすれば「17時」
  minute: 0,
  mpId: 42,     // コートID
};

// 予約したい日付たち（例：2025年12月の第1〜第4土曜）
// ★ day だけ差し替えれば OK（曜日は自分で調整）
const targets = [
  { year: 2025, month: 12, day: 14,  ...BASE_PATTERN }, // 第1土
  { year: 2025, month: 12, day: 20, ...BASE_PATTERN }, // 第2土
  { year: 2025, month: 12, day: 21, ...BASE_PATTERN }, // 第3土
  { year: 2025, month: 12, day: 27, ...BASE_PATTERN }, // 第4土 ここだけ空きあり
  // 必要なら第5土もここに追加
];

// ============================
// 実行本体
// ============================

(async () => {
  try {
    console.log('🚀 reserveManyParallel を開始します');
    console.log('ターゲット一覧:');
    targets.forEach(t => {
      const label =
        `${t.year}/${String(t.month).padStart(2, '0')}/${String(t.day).padStart(2, '0')} ` +
        `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')} (mpId=${t.mpId})`;
      console.log('  -', label);
    });

    const results = await reserveManyParallel(targets, {
      site: 'magome',   // Sheets/Slack 用のラベル。好きな名前にしてOK
      headless: false,  // 動きを目視したいので false 推奨
      maxParallel: 5,   // 最大5窓まで並列
    });

    console.log('✅ reserveManyParallel results:');
    console.dir(results, { depth: null });
  } catch (err) {
    console.error('💥 mtc.js top-level error:', err);
  }
})();
