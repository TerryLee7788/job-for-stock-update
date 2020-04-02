const dotenv = require('dotenv');
dotenv.config();

const creds = {
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
}

module.exports = {
    creds,
    SHEET_ID: process.env.SHEET_ID
}
