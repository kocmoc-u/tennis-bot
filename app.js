// app.js
require('dotenv').config();
const { App } = require('@slack/bolt');
const { writeTest, appendLogRow } = require('./sheets');

// Bolt アプリ本体
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  port: process.env.PORT || 3000,
});

// Slashコマンド /tennis に反応
app.command('/tennis', async ({ command, ack, respond }) => {
  await ack();

  const text = (command.text || '').trim();

  // サブコマンドが何もない場合
  if (!text) {
    await respond("🎾 テニスボット生きてます！ `/tennis test` や `/tennis log ...` も試せるよ。");
    return;
  }

  const [sub, ...args] = text.split(/\s+/);

  // `/tennis test`
  if (sub === "test") {
    try {
      await writeTest();
      await respond("🎾 スプシに書き込み成功したよ！（A1 に Hello from bot!）");
    } catch (err) {
      console.error(err);
      await respond("😢 test書き込みでエラーが起きた…ログを見てちょうだい！");
    }
    return;
  }

  // `/tennis log xxx`
  if (sub === "log") {
    const message = args.join(" ") || "(no message)";

    try {
      await appendLogRow({
        kind: "manual",
        message,
        status: "note",
      });

      await respond(`📗 logシートに記録したよ！\n> ${message}`);
    } catch (err) {
      console.error(err);
      await respond("😢 ログ書き込みでエラーが起きた…ログを見てちょうだい！");
    }
    return;
  }

  // `/tennis reserve_try ...`
  // `/tennis reserve_ok ...`
  // `/tennis reserve_ng ...`
  if (sub === "reserve_try" || sub === "reserve_ok" || sub === "reserve_ng") {
    const [targetDate, startTime, endTime, court, ...restMessage] = args;

    // 引数チェック（最低限）
    if (!targetDate || !startTime || !endTime || !court) {
      await respond(
        "⚠ 使い方: `/tennis " +
          sub +
          " YYYY-MM-DD HH:MM HH:MM COURT 任意のメッセージ`\n" +
          "例: `/tennis " +
          sub +
          " 2025-12-10 18:00 20:00 A 予約テスト`"
      );
      return;
    }

    const message = restMessage.join(" ") || "";

    // kind と status を sub から決める
    let status = "";
    if (sub === "reserve_try") status = "pending";
    if (sub === "reserve_ok") status = "success";
    if (sub === "reserve_ng") status = "failed";

    try {
      await appendLogRow({
        kind: sub,          // "reserve_try" などそのまま入れる
        targetDate,
        startTime,
        endTime,
        court,
        status,
        message,
      });

      await respond(
        `📝 予約ログを記録したよ！\n` +
        `- kind: ${sub}\n` +
        `- date: ${targetDate}\n` +
        `- time: ${startTime} - ${endTime}\n` +
        `- court: ${court}\n` +
        (message ? `- message: ${message}` : "")
      );
    } catch (err) {
      console.error(err);
      await respond("😢 予約ログ書き込みでエラーが起きた…ログを見てちょうだい！");
    }

    return;
  }

  // それ以外（未対応サブコマンド）
  await respond(
    "🤔 未対応のサブコマンドだよ。\n" +
    "使えるのは `test`, `log`, `reserve_try`, `reserve_ok`, `reserve_ng` だよ。"
  );
});

// おまけ：メッセージに「テニス」が含まれてたら返事する
app.message(/テニス/, async ({ message, say }) => {
  await say(`テニスの話してる？ <@${message.user}>`);
});

// アプリ起動
(async () => {
  await app.start();
  console.log('⚡️ Tennis Slack bot is running!');
})();
