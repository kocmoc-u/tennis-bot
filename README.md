# 🎾 テニス予約ボット（Tennis Reservation Bot）

自動でテニスコートの予約操作を行うための Node.js ベースの自動化ボットです。  
Puppeteer を用いてログイン・ページ遷移・予約処理を行い、  
予約ログは Google スプレッドシートに自動記録されます。


---

## 🚀 機能概要

### 1. **ログインの自動化**
- ID・パスワードを `.env` ファイルから読み込み、自動でログイン。
- ログインページ → トップ → 予約ページまで完全自動遷移。

### 2. **予約ページ操作**
- 指定された日付・時間のスロットを検索。
- 対象スロットが空きの場合、自動で予約実行。
- ページ構造の変化に強いセレクタ設計（WIP）。

### 3. **ログのスプレッドシート自動記録**
- `sheets.js` を通じて Google Sheets API v4 を使用。
- 予約、操作ログを以下のように記録：
  - `kind`
  - `targetDate`
  - `startTime`
  - `endTime`
  - `userId`
  - `message`
  - `timestamp`

### 4. **実行テスト用ユーティリティ**
- `writeTest()`  
  → スプシへテスト書き込み（動作確認用）
- ログ書き込み専用の `appendLogRow()`  
  → スロット操作時のデバッグ用


---

## 🛠 使用技術

- **Node.js**
- **Puppeteer Core**
- **Google Sheets API (v4)**
- **dotenv**
- **Chrome Remote Debugging（将来的に）**


---

## 📁 ディレクトリ構成（簡易版）
```
/tennis-bot
├─ mtc-login.js # ログイン〜予約ページ遷移処理
├─ mtc-date.js # 日付関連の処理（補正・変換）
├─ sheets.js # Google Sheets 連携
├─ .env # 認証情報・ID・URL
└─ package.json
```

---

## ⚙️ セットアップ（簡易）  
  
1. インストール  
npm install  
  
2. .env の準備  
``LOGIN_ID=xxxx``  
``LOGIN_PASSWORD=xxxx``  
``SPREADSHEET_ID=xxxxx``  
``GOOGLE_APPLICATION_CREDENTIALS=./credentials.json``  
  
3. 動作確認（スプシ書き込み）  
``node sheets.js``  
▶️ 実行方法（仮）  
``node mtc.js``  
  
📌 今後の予定（WIP）  
予約ロジックの安定化  
予約失敗時のリトライ処理  
スプレッドシートのログ構造整理  
Puppeteer の headless モード最適化  
  
📄 ライセンス  
This project is for personal/educational use

