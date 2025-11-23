// mtc-slot.js

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickSlot(page, target) {
  const { year, month, day, hour, minute, mpId } = target;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mi = String(minute).padStart(2, '0');

  // ベースのセレクタ（mpId なし）
  const baseSelector =
    'li.calendar-content-li' +
    `[year="${year}"]` +
    `[month="${mm}"]` +
    `[day="${dd}"]` +
    `[h="${hh}"]` +
    `[m="${mi}"]`;

  let selector = baseSelector;

  // 特定コートに絞りたい場合だけ mp_id を付ける
  if (mpId != null) {
    selector += `[mp_id="${mpId}"]`;
  }

  console.log('slot selector:', selector);

  await sleep(1000);

  // ★ デバッグ：その時間帯の li を全部ログに出す
  const debugSlots = await page.$$eval(
    'li.calendar-content-li',
    (els) =>
      els.map((el) => ({
        year: el.getAttribute('year'),
        month: el.getAttribute('month'),
        day: el.getAttribute('day'),
        h: el.getAttribute('h'),
        m: el.getAttribute('m'),
        mp_id: el.getAttribute('mp_id'),
      }))
  );
  console.log('calendar-content-li 一覧(最初の20件):', debugSlots.slice(0, 20));

  const li = await page.$(selector);

  // mpId指定ありで見つからない場合、候補一覧をログ
  if (!li && mpId != null) {
    const candidates = await page.$$eval(baseSelector, (els) =>
      els.map((el) => el.getAttribute('mp_id'))
    );
    console.log(`baseSelector = ${baseSelector}`);
    console.log('この時間に存在する mp_id 候補:', candidates);

    if (candidates.length === 0) {
      throw new Error('対象時間帯にスロットが存在しなかった（全部埋まり or 営業外かも）');
    } else {
      throw new Error(
        `指定した mpId=${mpId} のスロットは無かった（存在する mp_id: [${candidates.join(
          ', '
        )}]）`
      );
    }
  }

  if (!li) {
    throw new Error('対象スロットが見つからなかった（li自体ゼロ）');
  }

  // li の中の <a> をクリック
  const link = await li.$('a');
  if (!link) {
    throw new Error('<li>の中に<a>が無かった');
  }

  await link.click();
  await sleep(1000); // モーダル表示待ち

  console.log('✅ スロットをクリック:', target);
}

module.exports = {
  clickSlot,
};
