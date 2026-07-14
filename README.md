# GO HEALTH Prototype

## 頁面入口

- `index.html`：GO HEALTH 首頁（Vercel 預設入口）
- `app-entry.html`：HAPPY GO APP 入口模擬，點選「健康挑戰」進入首次授權頁
- `terms.html`：首次授權／同意頁
- `group.html`：群組頁
- `exchange.html`：健康點兌換 HAPPY GO 點數流程 Demo
- `error-simulator.html`：錯誤情境模擬

## 群組狀態測試

- `group.html`：一般群組狀態
- `group.html?state=empty`：近期無參與賺點任務狀態

## 部署說明

本資料夾可直接放在 Vercel 專案根目錄。CSS、JavaScript 與圖片的相對路徑已依目前資料夾結構設定。

`家事達人`尚未提供正式遊戲網址，目前點擊時會顯示「遊戲連結待設定」。取得網址後，請在 `index.html` 更新該卡片的 `href`。

亞東醫院 LINE 官方連結尚未提供，目前點擊「加入好友」會顯示待設定提示。取得正式網址後，請在 `index.html` 更新 LINE 服務卡的 `href`，並移除原本的 `onclick` 提示。

健康點兌換 Demo 的餘額、匯率與限時點數效期集中設定於 `assets/data.js` 的 `exchange` 區塊。目前假設為：500 健康點兌換 1 點、最低兌換 1 點、整數兌換、餘數保留、立即入點、成功後不可取消、入點失敗不扣健康點。
