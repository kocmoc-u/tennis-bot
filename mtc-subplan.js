// mtc-subplan.js

// ちょっと待つユーティリティ（他と合わせておく）
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * サブプラン（時間数）を選択して「次へ進む」を押す
 *
 * @param {import('puppeteer-core').Page} page
 * @param {{ spId?: string }} options  spId: <option value="??"> の value
 */
async function selectSubplanAndNext(page, options = {}) {
  const { spId = "28" } = options; // デフォルト: 「１時間（土日祝）」 = value="28"

  const selectSelector = "#sp_select";
  const nextButtonSelector = "#link_next";

  console.log("▼ サブプラン選択モーダル待機");
  await page.waitForSelector(selectSelector, { visible: true, timeout: 10000 });

  console.log(`▼ サブプランを選択 (value=${spId})`);
  // Puppeteer の select は onchange も発火してくれる
  await page.select(selectSelector, spId);

  await sleep(300); // 画面側の処理待ち（selectSp(...) が走る）

  console.log("▼ 「次へ進む」ボタンをクリック");
  await Promise.all([
    page.click(nextButtonSelector),
    // doSubmit() で次の画面に遷移する想定
    page.waitForNavigation({ waitUntil: "networkidle2" }),
  ]);

  console.log("✅ サブプラン選択 → 次の確認画面へ遷移完了！");
}

module.exports = { selectSubplanAndNext };
