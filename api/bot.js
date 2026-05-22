const https = require('https');

const TELEGRAM_TOKEN = '8710096221:AAGuCb2TjL_jj4wCJR2wn7PyfWCU9ehxL2I';
const WEB_APP_URL = 'https://cartel-models-bot.vercel.app'; 

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('CARTEL MODELS Bot Server is active.');
  }

  try {
    const body = req.body;
    if (!body) return res.status(200).send('Empty body');

    // Безопасно извлекаем сообщение, если оно есть
    const message = body.message;

    // 1. ОБРАБОТКА ТЕКСТОВОЙ КОМАНДЫ /start В ЧАТЕ БОТА
    if (message && message.text === '/start') {
      const chatId = message.chat.id;
      
      const welcomeText = 
        `Welcome to *CARTEL MODELS*.\n\n` +
        `We are an exclusive scouting and management agency. ` +
        `If you want to become a part of our team, please click the button below to submit your application form.`;

      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
      
      const payload = JSON.stringify({
        chat_id: chatId,
        text: welcomeText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '⚡ FILL APPLICATION',
                web_app: { url: WEB_APP_URL }
              }
            ]
          ]
        }
      });

      await sendToTelegram(telegramUrl, payload);
      return res.status(200).send('Start command processed');
    }

    // 2. ОБРАБОТКА СИСТЕМНОГО СООБЩЕНИЯ ИЗ WEB APP DATA (tg.sendData)
    if (message && message.web_app_data) {
      const chatId = message.chat.id;
      const dataAction = message.web_app_data.data;

      if (dataAction === 'application_sent') {
        const successText = 
          `*Thank you!*\n\n` +
          `Your application has been successfully submitted. ` +
          `The representatives of *CARTEL MODELS* will review your profile and contact you shortly if your types match our criteria.`;

        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        const payload = JSON.stringify({
          chat_id: chatId,
          text: successText,
          parse_mode: 'Markdown'
        });

        await sendToTelegram(telegramUrl, payload);
        return res.status(200).send('Web app notification sent');
      }
    }

    // Если пришел технический апдейт без message (открытие приложения, кнопка меню и т.д.)
    return res.status(200).send('Update received but no action required');

  } catch (error) {
    console.error('Webhook Error:', error);
    // Всегда возвращаем 200, чтобы Телеграм не гонял упавшие запросы по кругу
    return res.status(200).send('Error processed'); 
  }
};

function sendToTelegram(url, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => resolve(responseBody));
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}