# 🎾 テニス予約ボット（Tennis Reservation Bot）

Node.js + Puppeteer による **テニスコート自動予約ロボ**。  
ログイン → 日付ジャンプ → スロット選択 → サブプラン選択 → 予約確定 まで **全自動**。  
さらに **Google Sheets ログ / Slack 通知 / スクリーンショット保存 / 複数候補予約（reserveMany）** に対応。

予約合戦（毎月10日の20時）を勝ち抜くために設計された、**実戦仕様の自動予約ツール**。


---

## 🚀 機能概要（最新）

### 1. フル自動ログイン
- `.env` のログイン情報を元に自動ログイン  
- ログイン → トップページ → 予約ページへ移動

### 2. カレンダー操作（jumpToDate）
- 月送り動作（`#next-month`）  
- 日付セル（`YYYYMMDD`）を直接クリック  
- モーダルの閉じ検知  
→ 安定して目標日にジャンプ

### 3. スロット検索 & クリック（clickSlot）
- `year, month, day, hour, minute, mpId` による厳密一致  
- DOM構造変化に強い属性セレクタ  
- スロットが存在しない場合は  
  **`slot_unavailable`** 扱い（致命的にしない）

### 4. サブプラン選択（selectSubplanAndNext）
- `<select id="sp_select">` に対して value を指定  
- 次へ進む → 確認画面へ遷移

### 5. 予約確定処理
- 最終確認ボタン `#res_confrim_submit` を押して予約確定  
- 成功 → `reserve_ok`  
- エラー → スクショ / Slack / Sheets へ記録

### 6. Google Sheets ログ記録
`appendLogRow()` により以下を記録：

- kind（success / full / error）
- timestamp（ISO形式）
- message（予約詳細）
- site（magome 等）

### 7. Slack 通知（Webhook）
- 成功：🎾  
- 満枠：⚠  
- 致命的エラー：💥  
- slotLabel も見やすく整形

### 8. エラー時スクリーンショット
- `/screenshots/` に PNG 自動保存  
- 種類：`fatal_error` / `confirm_error` / `slot_unavailable` など

### 9. 複数候補予約（reserveMany）
```
reserveMany([
  { year: 2025, month: 12, day: 21, hour: 9, minute: 0, mpId: 42 },
  { year: 2025, month: 12, day: 28, hour: 17, minute: 0, mpId: 42 },
]);
```

挙動：
満枠 → 次へ
成功 → 即終了
致命的エラー → 中断


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
├─ mtc.js                # 実行用（reserveOnce/reserveMany を呼ぶ）
├─ reserve-core.js       # 予約ロジック本体
├─ mtc-date.js           # カレンダー操作
├─ mtc-slot.js           # スロット検索 & クリック
├─ mtc-subplan.js        # サブプラン選択
│
├─ utils/
│   ├─ screenshot.js     # エラー時スクショ
│   └─ slack.js          # Slack通知
│
├─ sheets.js             # Google Sheets 連携
├─ screenshots/          # スクショ保存
├─ .env                  # 認証情報
└─ package.json
```

---

## ⚙️ セットアップ（簡易）

1. インストール
npm install

2. .env の準備
``LOGIN_ID=xxxx``
``LOGIN_PASSWORD=xxxx``
``SLACK_WEBHOOK_URL=xxxx``
``SPREADSHEET_ID=xxxxx``
``GOOGLE_APPLICATION_CREDENTIALS=./credentials.json``

3. 動作確認（スプシ書き込み）
``node sheets.js``
4. ▶️ 単発予約
``node mtc.js``
5. 複数候補予約（reserveMany）
```
const targets = [
  { year: 2025, month: 12, day: 21, hour: 9, minute: 0, mpId: 42 },
  { year: 2025, month: 12, day: 28, hour: 17, minute: 0, mpId: 42 },
];
reserveMany(targets); 
```
6. 📌 今後の予定（WIP）
予約ロジックの安定化
予約失敗時のリトライ処理
スプレッドシートのログ構造整理
Puppeteer の headless モード最適化

📄 ライセンス
This project is for personal/educational use