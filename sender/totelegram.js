const axios = require('axios');
const url = process.env.TELEGRAM_ADRESS


async function sendStringToAPI(data) {
    try {
        const response = await axios.post(url, { message: data }, {  // <-- Тут исправлено "text" → "message"
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Ответ API:', response.data);
    } catch (error) {
        console.error('Ошибка при отправке запроса:', error.message);
    }
}

module.exports = sendStringToAPI;