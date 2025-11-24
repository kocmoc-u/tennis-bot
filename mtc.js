// mtc.js
/* const { reserveOnce } = require('./reserve-core');

(async () => {
  // テスト用ターゲット（ここは自由に書き換え）
  const target = {
    year: 2025,
    month: 12,
    day: 21,
    hour: 9,
    minute: 0,
    mpId: 42,
    // spId: '28', // 必要なら指定（デフォルト 28）
  };

  const result = await reserveOnce(target, {
    site: 'MTC reserve test',
    headless: false, // 画面見たいときは false、本番は true でもOK
  });

  console.log('reserveOnce result:', result);
})(); */

const { reserveMany } = require('./reserve-core');

(async () => {
  const targets = [
    { year: 2025, month: 12, day: 21,  hour: 9, minute: 0, mpId: 42 },
    { year: 2025, month: 12, day: 28, hour: 17, minute: 0, mpId: 42 },
  ];

  const results = await reserveMany(targets, {
    site: 'MTC resereve test',
    headless: false,
    stopOnSuccess: true,
  });

  console.log('reserveMany results:', results);
})();
