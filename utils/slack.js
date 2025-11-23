// utils/slack.js
require('dotenv').config();

// Node 18+ なら fetch はグローバルにある想定

async function sendSlack(text) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.warn("⚠ SLACK_WEBHOOK_URL が未設定なのでSlack通知スキップ");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.warn("⚠ Slack 通知に失敗:", res.status, await res.text());
    } else {
      console.log("📨 Slack 通知送信:", text);
    }
  } catch (err) {
    console.warn("⚠ Slack 通知エラー:", err);
  }
}

module.exports = { sendSlack };
