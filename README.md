# GO HEALTH Prototype

## 頁面入口

- `index.html`：GO HEALTH 首頁（Vercel 預設入口）
- `app-entry.html`：HAPPY GO APP 入口模擬，點選「健康挑戰」進入首次授權頁
- `terms.html`：首次授權／同意頁
- `group.html`：群組頁
- `records.html`：我的動腦紀錄，可切換四款遊戲查看近期完成時間與 Level
- `exchange.html`：健康點兌換 HAPPY GO 點數流程 Demo
- `points-history.html`：三個月內最新 100 筆累點與成功兌點紀錄整合頁
- `exchange-history.html`：舊網址相容轉址，會導向健康點紀錄
- `error-simulator.html`：錯誤情境模擬

## 群組狀態測試

- `group.html`：一般群組狀態
- `group.html?state=empty`：近期無參與賺點任務狀態

## 部署說明

本資料夾可直接放在 Vercel 專案根目錄。CSS、JavaScript 與圖片的相對路徑已依目前資料夾結構設定。

`家事達人`尚未提供正式遊戲網址，目前點擊時會顯示「遊戲連結待設定」。取得網址後，請在 `index.html` 更新該卡片的 `href`。

亞東醫院 LINE 官方帳號已設定為：<https://page.line.me/769uaenm>。首頁點擊「加入好友」會在新視窗開啟正式 LINE 頁面。

健康點兌換 Demo 的餘額、匯率與限時點數效期集中設定於 `assets/data.js` 的 `exchange` 區塊。目前假設為：500 健康點兌換 1 點、最低兌換 1 點、整數兌換、餘數保留、立即入點、成功後不可取消、入點失敗不扣健康點。

健康點累積範例集中設定於 `assets/data.js` 的 `pointHistory`，成功兌換紀錄則位於 `exchangeHistory`；`points-history.html` 會依時間整合顯示，不呈現失敗、處理中或到期項目。健康點依取得年度分批計算效期，兌換時優先扣除最早到期批次。HAPPY GO 限時點數效期為入點後 90 天。

首頁公告文字與輪播參數集中設定於 `assets/data.js` 的 `announcement` 區塊：`messages` 管理公告內容，`pixelsPerSecond` 控制移動速度，`pauseMilliseconds` 控制每輪開始前停留時間，`messageGapPixels` 控制兩輪文字間距。使用者開啟「減少動態效果」時，公告將停止自動輪播並可手動橫向查看。

動腦紀錄 Prototype 的本月總覽、遊戲清單與近期完成紀錄集中設定於 `assets/data.js` 的 `brainRecords` 區塊；目前皆為展示用假資料，不串接 API。

公告在一般模式下固定輪播，不再依裝置寬度自動停用；若完全不移動，請先確認裝置或瀏覽器是否開啟「減少動態效果」。
