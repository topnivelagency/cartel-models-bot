const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase для бота (чтобы при необходимости слать уведомления админу)
const SUPABASE_URL = 'https://sanixqycrowmzpvvesdm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbml4cXljcm93bXpwdnZlc2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg5MTcsImV4cCI6MjA5NTAzNDkxN30.4dOt8DPrmJxD5k0OMxKnycU7I6936ZieuoU9UIWeVzM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Твой токен от BotFather (лучше хранить в Environment Variables на Vercel)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8710096221:AAGuCb2TjL_jj4wCJR2wn7PyfWCU9ehxL2I';

module.exports = async (req, res) => {
  // Проверяем, что запрос пришел методом POST от Telegram
  if (req.method !== 'POST') {
    return res.status(200).send('CARTEL MODELS Bot is running...');
  }

  try {
    const { message, web_app_data } = req.body;

    // 1. ОБРАБОТКА КОМАНДЫ /start
    if (message && message.text === '/start') {
      const chatId = message.chat.id;
      
      const welcomeText = 
        `Welcome to *CARTEL MODELS*.\n\n` +
        `We are an exclusive scouting and management agency. ` +
        `If you want to become a part of our team, please click the button below to submit your application form.`;

      // Отправляем сообщение со встроенной кнопкой Web App
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeText,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '⚡ FILL APPLICATION',
                  // Ссылка на твой созданный Web App в BotFather
                  web_app: { url: 't.me/cartelmodelsbot/apply' } // Тут будет твой URL Vercel фронтенда
                }
              ]
            ]
          }
        })
      });
    }

    // 2. ОБРАБОТКА ДАННЫХ ИЗ WEB APP (когда форма шлет tg.sendData)
    if (message && message.web_app_data) {
      const chatId = message.chat.id;
      const dataAction = message.web_app_data.data;

      if (dataAction === 'application_sent') {
        const successMessage = 
          `*Thank you!*\n\n` +
          `Your application has been successfully submitted. ` +
          `The representatives of *CARTEL MODELS* will review your profile and contact you shortly if your types match our criteria.`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: successMessage,
            parse_mode: 'Markdown'
          })
        });
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Bot Error:', error);
    return res.status(500).send('Internal Error');
  }
};