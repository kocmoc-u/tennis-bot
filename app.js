// app.js
require('dotenv').config();
const { App } = require('@slack/bolt');

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
  // まずACK（これを返さないとSlack側が「エラー扱い」する）
  await ack();

  await respond({
    text: `🎾 テニスボット生きてます！`,
  });
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
