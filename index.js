const TelegramApi = require('node-telegram-bot-api');
const OpenAI = require('openai-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const openai = new OpenAI(process.env.OPENAI_API_KEY);

const bot = new TelegramApi(token, { polling: true });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text ? msg.text : '';
  
    if (messageText.startsWith('/start')) {
    //   bot.sendMessage(chatId, 'Ask me a question in any language you like, or use the /generate command');
      bot.sendMessage(chatId, 'Ask me a question in any language you like');
    } 
    // else if (messageText.startsWith('/generate')) {
    //   bot.sendMessage(chatId, 'Submit a photo to generate a similar one');

    //   const botInfo = await bot.getMe();
    //   console.log(botInfo)
    //     bot.once('photo', async (msg) => {
    //     const processingMsg = await bot.sendMessage(chatId, 'Please wait, the photo request is being processed...');
    //     try {
    //         let photoUrl = '';
    //         if (msg.photo && msg.photo.length > 0 && msg.photo[msg.photo.length - 1].file_id) {
    //         const photo = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
    //         photoUrl = photo.file_path ? `https://api.telegram.org/file/bot${token}/${photo.file_path}` : photo.file_url;
    //         }

    //         try {
    //         const response = await openai.complete({
    //             engine: 'davinci',
    //             prompt: `Generate a photo similar to this: ${photoUrl}. Description: dog on the street`,
    //             maxTokens: 1000,
    //         });
    //         if (response.data.outputs && response.data.outputs.length > 0) {
    //             photoUrl = response.data.outputs[0].output_url;
    //         }
    //         bot.sendPhoto(chatId, photoUrl);
    //         bot.editMessageText('Here is your generated photo:', { chat_id: chatId, message_id: processingMsg.message_id });
    //         }catch(error){
    //         console.error(error);
    //         bot.editMessageText('Sorry, something went wrong while generating the photo. Please try again later. 0', { chat_id: chatId, message_id: processingMsg.message_id, text: '' });
    //         }
    //     } catch (error) {
    //         console.error(error);
    //         bot.editMessageText('Sorry, something went wrong while generating the photo. Please try again later.', { chat_id: chatId, message_id: processingMsg.message_id, text: '' });
    //     }
    //     });

    // } 
    else {
      if (msg.photo && msg.photo.length > 0 && msg.photo[msg.photo.length - 1].file_id) { // проверка на наличие фото в сообщении
        bot.sendMessage(chatId, 'To work with a photo, use the /generate command');
      } else {
        const processingMsg = await bot.sendMessage(chatId, '...');
        // await analyzeDialog(0, 10, processingMsg, chatId, bot, openai);
        const response = await openai.complete({
            engine: 'text-davinci-003',
            prompt: `${messageText}`,
            maxTokens: 3000,
        });
        
        const answer = response.data.choices[0].text.trim();
        bot.editMessageText(`${answer}`, { chat_id: chatId, message_id: processingMsg.message_id });
      }
    }
  });

bot.on('polling_error', async (error) => {
  console.error(error);
});

async function analyzeDialog(depth, maxDepth, processingMsg, chatId, bot, openai, dialog = '') {
    try {
      const response = await openai.complete({
        engine: 'text-davinci-003',
        prompt: `${dialog}\n`,
        maxTokens: 3000,
      });
      const nextBotMessage = response.data.choices[0].text.trim();
  
      await bot.editMessageText(`${nextBotMessage}`, { chat_id: chatId, message_id: processingMsg.message_id });

      if (depth >= maxDepth) {
        return;
      }

      // Ждем ответа пользователя
      const onMessage = async (msg) => {
        if (msg.chat.id !== chatId) {
          return;
        }
        
        const userMessage = msg.text.trim();
        const newDialog = `${dialog}USER: ${userMessage}\n`;
  
        bot.off('message', onMessage);
        await analyzeDialog(depth + 1, maxDepth, chatId, bot, openai, newDialog);
      };
  
      bot.on('message', onMessage);
    } 
    catch (error) {
      console.error(error);
      await bot.sendMessage(chatId, 'Sorry, something went wrong while analyzing the dialog. Please try again later.');
    }
}