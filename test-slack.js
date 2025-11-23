// slack通知テスト用
const { sendSlack } = require('./utils/slack');

(async () => {
  await sendSlack("🔔 Slack Webhook テスト from TennisReserveNotifer");
})();