// sheets.js
const { google } = require('googleapis');
require('dotenv').config();

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  return sheets;
}

async function writeTest() {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [["Hello from bot!"]],
    },
  });

  console.log("✅ スプシへの書き込み成功！");
}

// ★ シンプル版ラッパー: kind / site / message だけ投げるやつ
async function appendLog(kind, site, message) {
  return appendLogRow({
    kind,
    site,
    message,
    targetDate: "",
    startTime: "",
    endTime: "",
    court: "",
    status: "",
  });
}


// ★ ユーザーIDなし版 append 関数
async function appendLogRow({
  kind,
  targetDate = "",
  startTime = "",
  endTime = "",
  court = "",
  site = "MTC",
  status = "",
  message = "",
}) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const timestamp = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "log!A:I", // A〜I列
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        timestamp,
        kind,
        targetDate,
        startTime,
        endTime,
        court,
        site,
        status,
        message,
      ]],
    },
  });

  console.log("✅ ログ追加:", {
    timestamp,
    kind,
    targetDate,
    startTime,
    endTime,
    court,
    site,
    status,
    message,
  });
}

async function appendLog(kind, site, message) {
  return appendLogRow({
    kind,
    site,
    message,
    targetDate: "",
    startTime: "",
    endTime: "",
    court: "",
    status: "",
  });
}

module.exports = {
  writeTest,
  appendLogRow,
  appendLog,
};
