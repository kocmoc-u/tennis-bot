// reserve-core.js
require('dotenv').config();
const puppeteer = require('puppeteer');

const { jumpToDate } = require('./mtc-date');
const { clickSlot } = require('./mtc-slot');
const { selectSubplanAndNext } = require('./mtc-subplan');
const { takeScreenshot } = require('./utils/screenshot');
const { sendSlack } = require('./utils/slack');
const { appendLog } = require('./sheets');

function buildSlotLabel(target) {
  const { year, month, day, hour, minute, mpId } = target;
  return (
    `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')} ` +
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (mpId=${mpId})`
  );
}

// 枠がない場合に特別扱い
function isSlotUnavailableError(err) {
  if (!err || !err.message) return false;
  return (
    err.message.includes('対象時間帯にスロットが存在しなかった') ||
    err.message.includes('指定した mpId')
  );
}

// 枠がない専用ハンドリング
function isSlotUnavailableError(err) {
  if (!err || !err.message) return false;
  return (
    err.message.includes('対象時間帯にスロットが存在しなかった') ||
    err.message.includes('指定した mpId')
  );
}

/**
 * 1つのターゲット枠を予約する
 * @param {object} target { year, month, day, hour, minute, mpId, spId? }
 * @param {object} options { site?: string, headless?: boolean }
 */
async function reserveOnce(target, options = {}) {
  const {
    site = 'MTC reserve',
    headless = false, // 普段は false で画面見ながら動作確認
  } = options;

  const LOGIN_URL = 'https://magometc.resv.jp/user/res_user.php';

  const loginIdSelector = '#loginid';
  const passwordSelector = 'input[type="password"]';
  const submitSelector = 'input[type="submit"]';

  const homeButtonSelector = '#right-column > div > div.btn-area1 > input';
  const reserveButtonSelector = '#link_next';

  const slotLabel = buildSlotLabel(target);
  const spId = target.spId || '28'; // デフォルト: 1時間(土日祝)

  let browser = null;
  let page = null;

  try {
    browser = await puppeteer.launch({
      headless,
      defaultViewport: { width: 1280, height: 800 },
    });

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

    // ホームボタン
    console.log('▼ ホームボタンをクリック');
    const homeBtn = await page.$(homeButtonSelector);
    if (homeBtn) {
      await Promise.all([
        homeBtn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);
      console.log('ホーム画面URL:', page.url());
    } else {
      console.warn('⚠ ホームボタンが見つからなかった（セレクタを要確認）');
    }

    // 予約ページへ
    console.log('▼ 「予約する（予約状況）」ボタンをクリック');
    const reserveBtn = await page.$(reserveButtonSelector);
    if (reserveBtn) {
      await Promise.all([
        reserveBtn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);
      console.log('✅ 予約ページっぽいURL:', page.url());
    } else {
      console.warn('⚠ 予約ボタンが見つからなかった（セレクタを要確認）');
    }

    // 日付ジャンプ
    await jumpToDate(page, {
      year: target.year,
      month: target.month,
      day: target.day,
    });

    // スロットクリック
    await clickSlot(page, target);

    // サブプラン選択 → 次へ
    await selectSubplanAndNext(page, { spId });

    // ▼ 最終確認画面の「完了する」ボタンをクリック
    console.log('▼ 予約の最終確定を実行');

    try {
      console.log('🐾 confirmブロック突入');

      await page.waitForSelector('#res_confrim_submit', { timeout: 10000 });
      await Promise.all([
        page.click('#res_confrim_submit'),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);

      console.log('🎉 予約確定成功！！');

      // スプシに成功ログ
      await appendLog(
        'reserve_ok',
        site,
        `予約確定成功: ${slotLabel}`,
      );

      // Slackにも成功通知
      await sendSlack(
        `🎾 *予約成功！*\n> ${slotLabel}\nfrom: ${site} bot`,
      );

      // 少し眺めたい場合
      await new Promise((resolve) => setTimeout(resolve, 5000));

      return {
        success: true,
        slotLabel,
      };
    } catch (err) {
      console.error('❌ 予約確定でエラー:', err);

      // 失敗したらスクショ（confirm_error）
      await takeScreenshot(page, 'confirm_error');

      // スプシに失敗ログ
      await appendLog(
        'reserve_ng',
        site,
        `予約確定失敗: ${slotLabel} / reason: ${err.message}`,
      );

      // Slackにも失敗通知
      await sendSlack(
        `💥 *予約失敗...*\n> ${slotLabel}\nreason: ${err.message}`,
      );

      return {
        success: false,
        slotLabel,
        error: err,
      };
    }
  } catch (err) {
    console.error('❌ ログイン〜予約ページ処理でエラー:', err);

    // ① まず「枠がない系のエラー」かどうか判定
  if (isSlotUnavailableError(err)) {
    console.warn('⚠ 枠がなかった／満枠っぽい:', err.message);

    // 必要ならスクショ（任意）
    if (page) {
      await takeScreenshot(page, 'slot_unavailable');
    }

    // スプシに「満枠ログ」
    await appendLog(
      'reserve_ng_full',
      site,
      `満枠などで予約できず: ${slotLabel} / reason: ${err.message}`,
    );

    // Slackにも「満枠」のお知らせ
    await sendSlack(
      `⚠ *満枠で予約できず*\n> ${slotLabel}\nreason: ${err.message}`,
    );

    // ★ ここがポイント：fatal にしない
    return {
      success: false,
      slotLabel,
      reason: 'slot_unavailable',
      fatal: false,
    };
  }

  // ② それ以外は本当に「致命的エラー」として扱う
  if (page) {
    console.log('⚠ fatal_error スクショ撮るよ');
    await takeScreenshot(page, 'fatal_error');
  } else {
    console.warn('⚠ page が未定義なのでスクショ撮れず');
  }

  await sendSlack(
    `💥 *予約処理全体でエラー発生*\n> ${slotLabel}\nreason: ${err.message}`,
  );

  await appendLog(
    'reserve_ng',
    site,
    `予約処理全体エラー: ${slotLabel} / reason: ${err.message}`,
  );

  return {
    success: false,
    slotLabel,
    error: err,
    fatal: true, // ← 本当にやばい時だけ fatal
  };

    
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 複数ターゲットを順番に試す
 * デフォルトでは「最初に成功した時点で止める」
 * @param {Array<object>} targets
 * @param {object} options { site?: string, headless?: boolean, stopOnSuccess?: boolean }
 */
async function reserveMany(targets, options = {}) {
  const { stopOnSuccess = true } = options;
  const results = [];

  for (const t of targets) {
    console.log('==============================');
    console.log('▼ 新しいターゲットで予約開始:', buildSlotLabel(t));

    const res = await reserveOnce(t, options);
    results.push(res);

    // ① 成功したら終了（stopOnSuccess=true の場合）
    if (res.success) {
      console.log('✅ 1つ予約が取れたのでループ終了');
      if (stopOnSuccess) break;
    }

    // ② 致命的エラーが起きたら残りを飛ばす
    if (res.fatal) {
      console.log('💥 致命的エラーが発生したので残りのターゲットはスキップします');
      break;
    }

    // ③ （満枠＝slot_unavailable のときは continue）
    //    → 何も書かなくて OK！ループが続くので自然に次へ
  }

  return results;
}

module.exports = {
  reserveOnce,
  reserveMany,
};