# 冰箱便利貼任務板

組員把任務貼在共用的任務版上，其他人自由認領，完成後賺取發布者的個人點數，再拿點數向該發布者兌換獎品。

規格見 [spec.md](spec.md)，頁面與欄位見 [design.md](design.md)，視覺稿見 [designs/](designs/)。

## 一行啟動

只要裝了 Docker：

```bash
cp .env.example .env
docker compose up
```

打開 <http://localhost:5173>。三個服務會一起起來：

| 服務 | 位置 | 說明 |
| --- | --- | --- |
| web | <http://localhost:5173> | Vue 3 + Vite |
| server | <http://localhost:4000> | Node.js + Express + Socket.IO |
| mongo | localhost:27017 | MongoDB 7，單節點 replica set |

資料存在 `mongo-data` volume，關掉容器後仍保留。

> MongoDB 以 `--replSet rs0` 啟動，第一次 healthcheck 會自動 `rs.initiate()`。
> 規格第 5、7、8 節的「一次完成」需要交易，交易只在 replica set 上運作。

## 展示帳號

第一次啟動且資料庫為空時會自動寫入展示資料，四個帳號都在「林家大小事」這一組：

| Email | 顯示名稱 |
| --- | --- |
| hsien@example.com | 阿賢 |
| mom@example.com | 媽媽 |
| kuei@example.com | 小葵 |
| ray@example.com | Ray |

密碼一律是 `demo1234`。邀請碼是 `K7QX2A`。

展示資料涵蓋四種任務狀態、各成員的獎品、由交易紀錄產生的點數餘額，以及待兌現／已兌現／已失效三種兌換紀錄
（已失效那筆是第五位成員「小明」離開組別後產生的，順便示範規格第 8 節的處理）。

想看雙人即時同步，用兩個瀏覽器（或一個無痕視窗）各登入一個帳號，開同一個任務版。

## 常用指令

```bash
# 重置：清空資料庫後重新寫入展示資料
docker compose exec server npm run seed:reset

# 自我檢查：跑規格的兩個驗收條件（同時認領、同時兌換）
docker compose exec server npm run check

# 只看後端日誌
docker compose logs -f server
```

## 不用 Docker 跑

需要自備一個以 replica set 啟動的 MongoDB。

```bash
# 後端
cd server && npm install
MONGO_URI="mongodb://localhost:27017/fridge-board?replicaSet=rs0" JWT_SECRET=dev-secret npm run dev

# 前端（另一個終端機）
cd web && npm install && npm run dev
```

## 專案結構

```
server/src
  index.js            Express 與 Socket.IO 的啟動點
  db.js               連線、索引、withTx 交易包裝
  auth.js             密碼雜湊、token、登入與成員檢查
  realtime.js         一個組別一個房間的廣播
  validate.js         欄位長度與範圍，AppError
  seed.js             展示資料（含 --reset）
  selfcheck.js        規格驗收條件的自我檢查
  routes/             auth、groups、tasks、rewards、ledger、reminders
  services/           points 帳本、membership 離開處理、rewards 兌換、shape 版面與輸出格式

web/src
  views/              對應 design.md 的九個路由
  components/         便利貼、彈窗、導覽列
  styles.css          設計稿的色票與元件樣式
  socket.js           即時同步連線
```

## 已知範圍

規格第 12 節列的項目（重複任務、第三方登入、角色分級、指定任務、組別自訂點數上下限）都沒有實作。
忘記密碼與個人資料頁也不在第一版。
