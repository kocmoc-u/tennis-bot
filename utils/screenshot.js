const fs = require('fs');   // ← ここ c 必須！
const path = require('path');

async function takeScreenshot(page, prefix = "error") {
  try {
    const dir = "./screenshots";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const filename = `${prefix}_${Date.now()}.png`;
    const filepath = path.join(dir, filename);

    await page.screenshot({ path: filepath, fullPage: true });

    console.log(`📸 スクショ保存: ${filepath}`);
    return filepath;
  } catch (err) {
    console.warn("⚠ スクショ保存に失敗:", err);
  }
}

module.exports = { takeScreenshot };

