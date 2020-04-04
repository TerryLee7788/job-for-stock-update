// 每天下午 6:00:00 觸發
const crontab = '0 * * * * *'
const schedule = require('node-schedule');
const { exec } = require('child_process');

const jobCallBack = () => {
    exec('node index.js', (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}

const job = schedule.scheduleJob(crontab, jobCallBack)
