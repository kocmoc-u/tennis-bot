// mtc-date.js

// 少し待つユーティリティ
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 希望日へジャンプする（予約日ポップアップカレンダー操作）
 *
 * target: { year, month, day }
 */
async function jumpToDate(page, target) {
  const { year, month, day } = target;

  const yyyy = String(year);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  const dateInputSelector = "#cur_date";
  const nextMonthSelector = "#next-month"; // カレンダー右矢印ボタン

  // 1. 現在の予約日（#cur_date の value）を取得
  const currentValue = await page.$eval(dateInputSelector, (el) =>
    el.value.trim()
  ); // 例: "2025/11/21"
  const [curYearStr, curMonthStr] = currentValue.split("/");
  const curYear = Number(curYearStr);
  const curMonth = Number(curMonthStr);

  // 2. 目的年月まで何ヶ月進めばいいか計算
  let diffMonths = (year - curYear) * 12 + (month - curMonth);
  if (diffMonths < 0) {
    console.warn(
      "⚠ 過去の日付には移動しないようにしています / diffMonths:",
      diffMonths
    );
    diffMonths = 0;
  }

  console.log(
    "現在年月:",
    curYear,
    curMonth,
    "→ 目標年月:",
    year,
    month,
    " diffMonths=",
    diffMonths
  );

  // 3. 予約日入力欄をクリックしてモーダル表示
  await page.click(dateInputSelector);

  // 4. 「次の月 >」ボタンが見えるまで待つ
  await page.waitForSelector(nextMonthSelector, {
    visible: true,
    timeout: 10000,
  });

  // 5. diffMonths 分だけ「次の月 >」ボタンをクリック
  for (let i = 0; i < diffMonths; i++) {
    await page.click(nextMonthSelector);
    await sleep(500); // 月が切り替わるのを待つ
  }

  // 6. 日付セルの ID を組み立てる
  const dateId = `${yyyy}${mm}${dd}`;
  console.log("狙う日付セル ID:", dateId);

  // 7. その ID の要素が DOM に出現するまで待つ（getElementById を使用）
  await page.waitForFunction(
    (id) => !!document.getElementById(id),
    { timeout: 10000 },
    dateId
  );

  // 8. 実際にクリック（これも getElementById 経由でやる）
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) el.click();
  }, dateId);

  console.log("✔ カレンダーの日付セルクリック成功 → カレンダー閉じるはず");

  // 9. カレンダー (#modal-win) が閉じるまで待つ
  await page.waitForFunction(() => {
    const modal = document.querySelector("#modal-win");
    if (!modal) return true; // DOMから消えた
    const style = window.getComputedStyle(modal);
    return style.display === "none" || style.opacity === "0";
  }, { timeout: 10000 });

  console.log("✔ カレンダーポップアップ閉じた！");

  // 10. メイン側の #cur_date が目的日に変わるまで待つ
  const expected = `${yyyy}/${mm}/${dd}`;
  await page.waitForFunction(
    (sel, expectedPrefix) => {
      const el = document.querySelector(sel);
      return el && el.value.startsWith(expectedPrefix);
    },
    { timeout: 10000 },
    dateInputSelector,
    expected
  );

  console.log(`🎉 ${expected} にジャンプ完了！`);
}

module.exports = { jumpToDate };
