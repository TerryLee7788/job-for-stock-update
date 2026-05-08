const { GoogleSpreadsheet } = require('google-spreadsheet')

let SHEET_ID, creds
try {
    // 本機開發時使用 config.js
    const config = require('./config')
    SHEET_ID = config.SHEET_ID
    creds = config.creds
} catch (e) {
    // GitHub Actions 環境下使用環境變數
    SHEET_ID = process.env.GOOGLE_SHEET_ID
    creds = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // 處理 Private Key 中的換行符號
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    }
}

const {
    getStockCurrentPrice,
    getStockDividendValue,
    getStockCurrentPriceFromYahoo,
    getDividendValue
} = require('./Service')

const SLEEP = 5 * 1000
const SHEETCELLS = 500
const START_AT = 3

function formateStockText(text) {
    return text.replace(/[^0-9]+/, '')
}

// 更新股利政策
function updateDividendStockPrice({
    STOCK,
    DIVIDENDCELL
}) {

    return getDividendValue(STOCK)
        .then((res) => {

            const { dividend: value } = res
            DIVIDENDCELL.value = value

        })

}

// 更新股價
function updateCurrentStockPrice({
    STOCK,
    TARGETCELL,
    DIVIDENDCELL
}) {

    return new Promise((resolve, reject) => {

        setTimeout(() => {
            console.log('開始處理 STOCK: ', STOCK);

            getStockCurrentPriceFromYahoo(STOCK)
                .then((res) => {

                    const { price: value } = res
                    TARGETCELL.value = +value
                    console.log(`✓ ${STOCK} 股價更新成功: ${value}`);
                    return res; // 重要：返回結果以繼續 Promise 鏈

                })
                .then(() => {

                    // 間隔 500 毫秒，再去更新股利
                    setTimeout(() => {

                        updateDividendStockPrice({
                            STOCK,
                            DIVIDENDCELL
                        })
                            .then(() => {
                                console.log(`✓ ${STOCK} 股利更新成功`);
                                resolve()

                            })
                            .catch((err) => {
                                console.log(`✗ ${STOCK} 股利更新失敗:`, err.message);
                                resolve(); // 股利失敗仍然繼續，不中斷主程序
                            })

                    }, 500);

                })
                .catch((err) => {
                    console.log(`✗ ${STOCK} 股價獲取失敗:`, err.message);
                    reject(err); // 股價失敗才拋出錯誤
                })

        }, SLEEP);

    })

}

async function accessSpreadSheet() {

    try {

        const doc = new GoogleSpreadsheet(SHEET_ID)

        await doc.useServiceAccountAuth(creds)
        await doc.loadInfo()

        const sheet = doc.sheetsByIndex[0]
        // load 範圍
        await sheet.loadCells(`A1:E${SHEETCELLS}`);

        let processedCount = 0;
        console.log('開始處理股票列表...\n');

        for (let i = START_AT; i < SHEETCELLS; i++) {

            // "股票" 那欄
            const a1 = sheet.getCell(i, 0);
            // "目前股價" 那欄
            const d3 = sheet.getCell(i, 3);
            // "股利政策" 那欄
            const b1 = sheet.getCell(i, 1);

            // 如果空格有填東西
            if (a1._rawData.effectiveValue) {

                const STOCK = formateStockText(a1._rawData.effectiveValue.stringValue)

                if (STOCK) {

                    try {
                        await updateCurrentStockPrice({
                            STOCK,
                            TARGETCELL: d3,
                            DIVIDENDCELL: b1
                        })
                        // sheet 更新
                        await sheet.saveUpdatedCells()
                        processedCount++;
                        console.log(`\n✓ 已保存 ${STOCK} 到 Sheet\n`);

                    } catch (itemError) {
                        console.log(`\n✗ 處理 ${STOCK} 時出錯，繼續下一個...`);
                        console.log(`  錯誤訊息: ${itemError.message}\n`);
                        // 繼續處理下一個股票
                        continue;
                    }

                } else {
                    // 無效的股票格式，跳過
                    continue;
                }

            } else {
                // 空的欄位，跳過
                continue;
            }

        }

        console.log(`\n✓ 完成！共處理了 ${processedCount} 只股票`);

    }
    catch (error) {

        console.log('致命錯誤: ', error);

    }

}

accessSpreadSheet()
