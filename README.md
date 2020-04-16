# job-for-stock-update
* 把自己整理的一些存股進場策略放到 google sheet 上
* 但... 每天手動更新股票好累，而且房間也好熱 (電腦一直開著...) QQ
* 只好發揮自己的 js 專長來解決問題囉~

## Features
* 使用 [google-spreadsheet](https://www.npmjs.com/package/google-spreadsheet) 更新 [google sheet](https://docs.google.com/spreadsheets/)
* 使用 [axios](https://github.com/axios/axios) 在 nodejs server 端，棄用 [證交所](https://www.twse.com.tw/) API，改用 [Yahoo](https://tw.stock.yahoo.com/) API 抓股票資料
* 使用 [cheerio](https://www.npmjs.com/package/cheerio) 寫爬蟲抓一些股票資訊
* 使用 [heroku](https://www.heroku.com/) 把 code 放在雲端主機
* 使用 [Heroku Scheduler](https://devcenter.heroku.com/articles/scheduler) 寫排程每天晚上6點執行更新表單
