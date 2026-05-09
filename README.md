# job-for-stock-update

* 整理的一些存股進場策略放到 google sheet 上
* 接著依照 google sheet 的股票代號利用 js 爬蟲更新 "股價 & 近3年" 的除權息資訊
* 再使用 github Action 設定排成，讓它自動化每天更新

## Features
* 使用 [google-spreadsheet](https://www.npmjs.com/package/google-spreadsheet) 更新 [google sheet](https://docs.google.com/spreadsheets/d/1dxwBIJ_yF_xEIM50iRPHUT6RjhZWrqPLUM1GohMMgaQ/edit?gid=1481342504#gid=1481342504)
* 使用 [axios](https://github.com/axios/axios) 在 nodejs server 端，棄用 [證交所](https://www.twse.com.tw/) API，改用 [Yahoo](https://tw.stock.yahoo.com/) API 抓股票資料
* 使用 [cheerio](https://www.npmjs.com/package/cheerio) 寫爬蟲抓一些股票網頁資訊
* 使用 [github Actions](https://github.com/TerryLee7788/job-for-stock-update/actions) 自動依照排程時間更新當日股價資訊
