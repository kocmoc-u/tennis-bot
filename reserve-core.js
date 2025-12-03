// reserve-core.js
require('dotenv').config();
const puppeteer = require('puppeteer');

const { jumpToDate } = require('./mtc-date');
const { clickSlot } = require('./mtc-slot');
const { selectSubplanAndNext } = require('./mtc-subplan');
const { takeScreenshot } = require('./utils/screenshot');
const { sendSlack } = require('./utils/slack');
const { appendLogRow } = require('./sheets');

// ============================
// 共通ヘルパー
// ============================

// 「今この瞬間の JST 時刻」を 'YYYY/MM/DD HH:mm:ss JST' 形式で返す
function getJstString() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type) => parts.find(p => p.type === type)?.value ?? '';

  const yyyy = get('year');
  const mm = get('month');
  const dd = get('day');
  const hh = get('hour');
  const mi = get('minute');
  const ss = get('second');

  return `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss} JST`;
}


const LOGIN_URL = 'https://magometc.resv.jp/user/res_user.php';

const loginIdSelector = '#loginid';
const passwordSelector = 'input[type="password"]';
const submitSelector = 'input[type="submit"]';
const homeButtonSelector = '#right-column > div > div.btn-area1 > input';
const reserveButtonSelector = '#link_next';

function buildSlotLabel(target) {
  const { year, month, day, hour, minute, mpId } = target;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mi = String(minute).padStart(2, '0');

  return `${year}/${mm}/${dd} ${hh}:${mi} (mpId=${mpId})`;
}

// Sheets 向けの軽いラッパ（status に JST 実行時刻を入れる）
async function appendLog(kind, site, message) {
  const execTimeJst = getJstString();  // ★ ここで毎回JST文字列を生成

  return appendLogRow({
    kind,
    site,
    status: execTimeJst,
    message,
  });
}

// 「枠がない」系のエラーを判定
function isSlotUnavailableError(err) {
  if (!err || !err.message) return false;
  return (
    err.message.includes('対象時間帯にスロットが存在しなかった') ||
    err.message.includes('指定した mpId')
  );
}

// ちょっと待つユーティリティ
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================
// 1件分の予約を実行するコア関数
// ============================

/**
 * 1件分の予約を実行する
 * @param {{ year:number, month:number, day:number, hour:number, minute:number, mpId:number }} target
 * @param {{ site?:string, headless?:boolean }} options
 * @returns {Promise<{success:boolean, slotLabel:string, reason?:string, error?:Error, fatal?:boolean}>}
 */
async function reserveOnce(target, options = {}) {
  const {
    site = 'magome',
    headless = false,
  } = options;

  const slotLabel = buildSlotLabel(target);

  let browser = null;
  let page = null;

  try {
    browser = await puppeteer.launch({
      headless,
      defaultViewport: { width: 1280, height: 800 },
    });

    page = await browser.newPage();

    // ▼ ログイン
    console.log('▼ ログインページへ移動');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

    console.log('▼ ID / PW を入力');
    await page.waitForSelector(loginIdSelector, { timeout: 10000 });
    await page.type(loginIdSelector, process.env.MAGOME_LOGIN_ID, { delay: 30 });
    await page.type(passwordSelector, process.env.MAGOME_LOGIN_PASSWORD, { delay: 30 });

    console.log('▼ ログインボタンをクリック');
    await Promise.all([
      page.click(submitSelector),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);
    console.log('ログイン後URL:', page.url());

    // ▼ ホームボタン→トップへ
    console.log('▼ ホームボタンをクリック');
    const homeBtn = await page.$(homeButtonSelector);
    if (homeBtn) {
      await Promise.all([
        homeBtn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);
      console.log('ホーム画面URL:', page.url());
    } else {
      console.warn('⚠ ホームボタンが見つからなかった（セレクタ要確認）');
    }

    // ▼ 予約ページへ
    console.log('▼ 「予約する（予約状況）」ボタンをクリック');
    const reserveBtn = await page.$(reserveButtonSelector);
    if (reserveBtn) {
      await Promise.all([
        reserveBtn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);
      console.log('✅ 予約ページっぽいURL:', page.url());
    } else {
      console.warn('⚠ 予約ボタンが見つからなかった（セレクタ要確認）');
    }

    // ▼ 日付ジャンプ
    await jumpToDate(page, {
      year: target.year,
      month: target.month,
      day: target.day,
    });

    // ▼ ここから「本丸」ブロック
    try {
      // スロットクリック
      await clickSlot(page, target);

      // サブプラン選択 → 次へ進む
      await selectSubplanAndNext(page, {
        spId: '28', // デフォルト：１時間（土日祝）など
      });

      // ▼ 確認画面で「完了する」押下
      console.log('▼ 予約の最終確定を実行');
      console.log('🐾 confirmブロック突入');

      await page.waitForSelector('#res_confrim_submit', { timeout: 10000 });
      await Promise.all([
        page.click('#res_confrim_submit'),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);

      console.log('🎉 予約確定成功！！');

      await appendLog(
        'reserve_ok',
        site,
        `予約確定成功: ${slotLabel}`,
      );

      const execTimeJst = getJstString();

      await sendSlack(
        `🎾 *予約成功！*\n> ${slotLabel}\n@ ${execTimeJst}\nfrom: ${site} bot`,
      );



      // 成功時、少し眺める
      await sleep(3000);

      return {
        success: true,
        slotLabel,
      };
    } catch (err) {
      // ▼ 枠がない（満枠／営業外）パターン
      if (isSlotUnavailableError(err)) {
        console.warn('⚠ 枠がなかった／満枠っぽい:', err.message);

        if (page) {
          await takeScreenshot(page, 'slot_unavailable');
        }

        await appendLog(
          'reserve_ng_full',
          site,
          `満枠などで予約できず: ${slotLabel} / reason: ${err.message}`,
        );

        const execTimeJst = getJstString();

        await sendSlack(
          `⚠ *満枠で予約できず*\n> ${slotLabel}\n@ ${execTimeJst}\nreason: ${err.message}`,
        );

        return {
          success: false,
          slotLabel,
          reason: 'slot_unavailable',
          fatal: false,
        };
      }

      // ▼ それ以外（確認画面〜確定周りの失敗など）
      console.error('❌ 予約確定処理中のエラー:', err);

      if (page) {
        await takeScreenshot(page, 'confirm_error');
      }

      await appendLog(
        'reserve_ng',
        site,
        `予約確定失敗: ${slotLabel} / reason: ${err.message}`,
      );

      const execTimeJst = getJstString();

      await sendSlack(
        `💥 *予約失敗...*\n> ${slotLabel}\n@ ${execTimeJst}\nreason: ${err.message}`,
      );

      return {
        success: false,
        slotLabel,
        error: err,
        fatal: false,
      };
    }
  } catch (err) {
    // ▼ ログイン〜予約ページ全体での致命的エラー
    console.error('❌ ログイン〜予約ページ処理でエラー:', err);

    if (isSlotUnavailableError(err)) {
      // 念のためここにも「枠なし」判定を入れておく（clickSlot で投げたものが外まで来た場合など）
      console.warn('⚠ (outer catch) 枠がなかった／満枠っぽい:', err.message);

      if (page) {
        await takeScreenshot(page, 'slot_unavailable_outer');
      }

      await appendLog(
        'reserve_ng_full',
        site,
        `満枠などで予約できず(outer): ${slotLabel} / reason: ${err.message}`,
      );

      const execTimeJst = getJstString();

      await sendSlack(
        `⚠ *満枠で予約できず(outer)*\n> ${slotLabel}\n@ ${execTimeJst}\nreason: ${err.message}`,
      );

      return {
        success: false,
        slotLabel,
        reason: 'slot_unavailable',
        fatal: false,
      };
    }

    if (page) {
      console.log('⚠ fatal_error スクショ撮るよ');
      await takeScreenshot(page, 'fatal_error');
    } else {
      console.warn('⚠ page が未定義なのでスクショ撮れず');
    }

    await appendLog(
      'reserve_ng',
      site,
      `予約処理全体エラー: ${slotLabel} / reason: ${err.message}`,
    );

    const execTimeJst = getJstString();

    await sendSlack(
      `💥 *予約処理全体でエラー発生*\n> ${slotLabel}\n@ ${execTimeJst}\nreason: ${err.message}`,
    );

    return {
      success: false,
      slotLabel,
      error: err,
      fatal: true,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ============================
// 複数候補：順次モード
// ============================

/**
 * 順次モード（A→B→C…と1つずつ試す）
 */
async function reserveManySequential(targets, options = {}) {
  const { stopOnSuccess = true } = options;
  const results = [];

  for (const t of targets) {
    console.log('==============================');
    console.log('▼ 新しいターゲットで予約開始(Sequential):', buildSlotLabel(t));

    const res = await reserveOnce(t, options);
    results.push(res);

    if (res.success && stopOnSuccess) {
      console.log('✅ 1つ予約が取れたのでループ終了 (Sequential)');
      break;
    }

    if (res.fatal) {
      console.log('💥 致命的エラーが発生したので残りのターゲットはスキップします (Sequential)');
      break;
    }

    // slot_unavailable の場合は自然に次ループへ
  }

  return results;
}

// ============================
// 複数候補：並列モード
// ============================

/**
 * 並列モード（最大 maxParallel 個まで同時に reserveOnce を起動）
 * 例：土曜4週分を同時に取りに行く、など
 */
async function reserveManyParallel(targets, options = {}) {
  const { maxParallel = 5 } = options;
  const results = [];

  for (let i = 0; i < targets.length; i += maxParallel) {
    const batch = targets.slice(i, i + maxParallel);

    console.log('==============================');
    console.log('▼ 並列バッチ開始(Parallel):');
    batch.forEach((t) => console.log('  -', buildSlotLabel(t)));

    const promises = batch.map((t) => reserveOnce(t, options));

    const settled = await Promise.allSettled(promises);

    settled.forEach((r, idx) => {
      const target = batch[idx];

      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        console.error('💥 reserveOnce が投げたエラー(Parallel):', r.reason);
        results.push({
          success: false,
          slotLabel: buildSlotLabel(target),
          error: r.reason,
          fatal: true,
        });
      }
    });

    // このバッチ内で fatal が出たら、残りバッチは実行しない
    if (results.some((r) => r.fatal)) {
      console.log('💥 並列バッチ内で致命的エラーが発生したため、残りのターゲットは実行しません (Parallel)');
      break;
    }
  }

  return results;
}

module.exports = {
  reserveOnce,
  reserveManySequential,
  reserveManyParallel,
};
