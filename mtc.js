// エラー時のスクショ対策で
let browser = null;
let page = null;


// ページへのログインを担当！
require('dotenv').config();
const puppeteer = require('puppeteer');

// カレンダーから目標の日時に狙い撃ち★
const { jumpToDate } = require('./mtc-date');

// コート予約枠クリック用のjsを呼び出し
const { clickSlot } = require('./mtc-slot');

// サブプランの選択
const { selectSubplanAndNext } = require('./mtc-subplan');

// 失敗時にスクショを撮る関数（カシャ！）
const { takeScreenshot } = require('./utils/screenshot');

// スプシに追記
const { appendLog } = require('./sheets');

// ← slack通知
const { sendSlack } = require('./utils/slack');

(async () => {
  const LOGIN_URL = 'https://magometc.resv.jp/user/res_user.php';

  const loginIdSelector = '#loginid';
  const passwordSelector = 'input[type="password"]';
  const submitSelector = 'input[type="submit"]';

  // ★ここをコスモスが埋める ★
  const homeButtonSelector = '#right-column > div > div.btn-area1 > input';
  const reserveButtonSelector = '#link_next';

   // ▼ 予約したいターゲット（ここを変えれば他も全部連動）
  const target = {
    year: 2025,
    month: 12,
    day: 21,
    hour: 9,
    minute: 0,
    mpId: 42, // コートID（必要に応じて変更）
  };

  // ログやSlackで使うラベル文字列（例: 2025/12/13 09:00 mpId=42）
  const slotLabel =
    `${target.year}/${String(target.month).padStart(2, "0")}/${String(target.day).padStart(2, "0")} ` +
    `${String(target.hour).padStart(2, "0")}:${String(target.minute).padStart(2, "0")} (mpId=${target.mpId})`;

  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    page = await browser.newPage();

    console.log('▼ ログインページへ移動');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

    // ログイン
    await page.waitForSelector(loginIdSelector, { timeout: 10000 });

    console.log('▼ ID / PW を入力');
    await page.type(loginIdSelector, process.env.MAGOME_LOGIN_ID, { delay: 30 });
    await page.type(passwordSelector, process.env.MAGOME_LOGIN_PASSWORD, { delay: 30 });

    console.log('▼ ログインボタンをクリック');
    await Promise.all([
      page.click(submitSelector),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    console.log('ログイン後URL:', page.url());

    // ▼ ホームボタンを押してトップへ
    console.log('▼ ホームボタンをクリック');
    const homeBtn = await page.$(homeButtonSelector);
    if (homeBtn) {
      await Promise.all([
        homeBtn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);
      console.log('ホーム画面URL:', page.url());
    } else {
      console.warn('⚠ ホームボタンが見つからなかった（セレクタを再確認して）');
    }





    // ▼ 予約する（予約状況）ボタンをクリック
    console.log('▼ 「予約する（予約状況）」ボタンをクリック');
    const reserveBtn = await page.$(reserveButtonSelector);
    if (reserveBtn) {
      await Promise.all([
        reserveBtn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);
      console.log('✅ 予約ページっぽいURL:', page.url());
    } else {
      console.warn('⚠ 予約ボタンが見つからなかった（セレクタを再確認して）');
    }

    // ① 日付ジャンプ
    await jumpToDate(page, {
      year: 2025,
      month: 12,
      day: 21,
    });

    // ターゲット枠をクリック
await clickSlot(page, target);

    // ③ サブプラン選択 → 次へ進む（1時間を自動選択）
    await selectSubplanAndNext(page, {
      spId: "28", // 「１時間（土日祝）」; 他のプラン使いたくなったらここを変える
    });

// ▼ 最終確認画面の「完了する」ボタンをクリック
console.log("▼ 予約の最終確定を実行");

try {
  console.log("🐾 confirmブロック突入"); // ← デバッグログ
  
  await page.waitForSelector('#res_confrim_submit', { timeout: 10000 });
  await Promise.all([
    page.click('#res_confrim_submit'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ]);

  console.log("🎉 予約確定成功！！");

  // スプシに成功ログ
  await appendLog(
    "reserve_ok",
  "magome",
  `予約確定成功: ${slotLabel}`
  );

   // Slackにも成功通知
  await sendSlack(
    `🎾 *予約成功！*\n> ${slotLabel}\nfrom: tennis-bot`
  );

} catch (err) {
  console.error("❌ 予約確定でエラー:", err);

  // 失敗したらスクショ（confirm_error）
   await takeScreenshot(page, "confirm_error");

  // スプシに失敗ログ（詳細版）
  await appendLog(
  "reserve_ng",
  "magome",
  `予約確定失敗: ${slotLabel} / reason: ${err.message}`
);
// Slackにも失敗通知
  await sendSlack(
    `💥 *予約失敗...*\n> ${slotLabel}\nreason: ${err.message}`
  );
}

    // 少し眺める時間
    await new Promise((resolve) => setTimeout(resolve, 15000));
  } catch (err) {
  console.error("❌ ログイン〜予約ページ処理でエラー:", err);

  if (page) {
    console.log("⚠ fatal_error スクショ撮るよ");
    await takeScreenshot(page, "fatal_error");
  } else {
    console.warn("⚠ page が未定義なのでスクショ撮れず");
  }

  // ここで Slack にも「致命的エラー」を通知
  await sendSlack(
    `💥 *予約処理全体でエラー発生*\n> ${slotLabel}\nreason: ${err.message}`
  );

} finally {
  if (browser) await browser.close();
}
})();

