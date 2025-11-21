// ページへのログインを担当！
require('dotenv').config();
const puppeteer = require('puppeteer');

// カレンダーから目標の日時に狙い撃ち★
const { jumpToDate } = require('./mtc-date');

// コート予約枠クリック用のjsを呼び出し
const { clickSlot } = require('./mtc-slot');

// サブプランの選択
const { selectSubplanAndNext } = require('./mtc-subplan');

(async () => {
  const LOGIN_URL = 'https://magometc.resv.jp/user/res_user.php';

  const loginIdSelector = '#loginid';
  const passwordSelector = 'input[type="password"]';
  const submitSelector = 'input[type="submit"]';

  // ★ここをコスモスが埋める ★
  const homeButtonSelector = '#right-column > div > div.btn-area1 > input';
  const reserveButtonSelector = '#link_next';

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();

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
      day: 13,
    });

    // ② 枠クリック
    await clickSlot(page, {
      year: 2025,
      month: 12,
      day: 13,
      hour: 9,
      minute: 0,
      mpId: 42, // コートを指定しないならこの行消してもOK
    });

    // ③ サブプラン選択 → 次へ進む（1時間を自動選択）
    await selectSubplanAndNext(page, {
      spId: "28", // 「１時間（土日祝）」; 他のプラン使いたくなったらここを変える
    });

    // ここから先は「確認画面」が出ている状態になる想定
    // → 次ステップで「予約確定ボタン」を自動クリックしていく予定

    // 少し眺める時間
    await new Promise((resolve) => setTimeout(resolve, 15000));
  } catch (err) {
    console.error('❌ ログイン〜予約ページ処理でエラー:', err);
  } finally {
    await browser.close();
  }
})();

