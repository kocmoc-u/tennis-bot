/**
 * 任意の年月日・時間・コート(mpId)の枠をクリックする
 * target: { year, month, day, hour, minute, mpId? }
 */

// 少し待つユーティリティ
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickSlot(page, target) {
  const { year, month, day, hour, minute, mpId } = target;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mi = String(minute).padStart(2, '0');

  // ベースのセレクタ
  let selector =
    'li.calendar-content-li' +
    `[year="${year}"]` +
    `[month="${mm}"]` +
    `[day="${dd}"]` +
    `[h="${hh}"]` +
    `[m="${mi}"]`;

  // 特定コートに絞りたい場合だけ mp_id を付ける
  if (mpId != null) {
    selector += `[mp_id="${mpId}"]`;
  }

  console.log('slot selector:', selector);

  await sleep(1000);

  const li = await page.$(selector);
  if (!li) {
    throw new Error('対象スロットが見つからなかった');
  }

  // li の中の <a> をクリック
  const link = await li.$('a');
  if (!link) {
    throw new Error('<li>の中に<a>が無かった');
  }

  await Promise.all([
    link.click(),
    // 挙動次第でここは調整（モーダルなら waitForSelector とかにする）
    await sleep(1000),
  ]);

  console.log('✅ スロットをクリック:', target);
}

module.exports = {
  clickSlot,
};
