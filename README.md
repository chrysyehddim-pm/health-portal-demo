# GO HEALTH Prototype

## 頁面入口

- `index.html`：GO HEALTH 首頁（Vercel 預設入口）
- `app-entry.html`：HAPPY GO APP 入口模擬，點選「健康挑戰」進入首次授權頁
- `terms.html`：首次授權／同意頁
- `group.html`：群組頁
- `error-simulator.html`：錯誤情境模擬

## 群組狀態測試

- `group.html`：一般群組狀態
- `group.html?state=empty`：近期無參與賺點任務狀態

## 部署說明

本資料夾可直接放在 Vercel 專案根目錄。CSS、JavaScript 與圖片的相對路徑已依目前資料夾結構設定。

`家事達人`尚未提供正式遊戲網址，目前點擊時會顯示「遊戲連結待設定」。取得網址後，請在 `index.html` 更新該卡片的 `href`。
