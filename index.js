const TelegramApi = require('node-telegram-bot-api');
const OpenAI = require('openai-api');
const axios = require('axios');

require('dotenv').config();


const token = process.env.TELEGRAM_BOT_TOKEN;
const newsApiKey = process.env.NEWS_API_KEY;
const openai = new OpenAI(process.env.OPENAI_API_KEY);
let isCommand = false;
const bot = new TelegramApi(token, { polling: true });

const commands = [
    { command: '/start', description: 'Start the bot' },
    { command: '/help', description: 'Get help with the bot' },
    { command: '/news', description: 'Get news for a selected topic' },
    { command: '/generate', description: 'Photo generation by description (beta)' },
    { command: '/photo', description: 'Generates similar photos based on the sent (beta)' },
];

// ***SET_COMMANDS**
bot.setMyCommands(commands);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text ? msg.text : '';
  
    // ***START***
     if (messageText.startsWith('/start') || messageText.startsWith('/ыефке')) {
        bot.sendMessage(chatId, 'Ask me a question in any language you like or use the /help command to see what I can do!');
    } 

    // ***HELP***
    else if(messageText.startsWith('/help') || messageText.startsWith('/рудз')){
        bot.sendMessage(chatId, `To understand what a bot can do, look at the following commands: 
        \n/news - get news for a selected topic 
        \n/generate - photo generation by description (beta)
        \n/photo - generates similar photos based on the sent (beta)
        \nEverything else I can just chat with you as a friend, just ask me about something`)
    }
    
    // ***NEWS***
    else if (messageText.startsWith('/news') || messageText.startsWith('/туцы') || messageText.startsWith('/nws')) {
        isCommand = true;

        if (isCommand) {
            bot.sendMessage(chatId, 'What are your interests?', {
              reply_markup: {
                inline_keyboard: [
                    [
                      { text: 'Tesla', callback_data: 'tesla' },
                      { text: 'Sports', callback_data: 'sports' },
                      { text: 'ChatGPT', callback_data: 'chatGPT' },
                    ],
                    [
                      { text: 'Music', callback_data: 'music' },
                      { text: 'Politics', callback_data: 'politics' },
                      { text: 'Apple', callback_data: 'apple' },
                    ],
                    [
                      { text: 'War', callback_data: 'war' },
                      { text: 'Footbal', callback_data: 'football' },
                      { text: 'Games', callback_data: 'games' },
                    ],
                ],
                one_time_keyboard: true,
              },
            });
        }

        bot.once('callback_query', async (query) => {
            const selectedInterest = query.data;
            await bot.answerCallbackQuery(query.id);
      
            bot.sendMessage(chatId, 'In what language do you want to read the news?', {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'English', callback_data: 'en' },
                    { text: 'Russian', callback_data: 'ru' },
                    { text: 'Spanish', callback_data: 'es' },
                  ],
                //   [
                //     { text: 'Chinese', callback_data: 'zh' },
                //     { text: 'Kazakh', callback_data: 'kk' },
                //     { text: 'Italian', callback_data: 'it' },
                //   ],
                //   [
                //     { text: 'German', callback_data: 'de' },
                //     { text: 'Japanese', callback_data: 'ja' },
                //     { text: 'French', callback_data: 'fr' },
                //   ],
                ],
                one_time_keyboard: true
              },
            });
      
            bot.once('callback_query', async (query) => {
              const selectedLanguage = query.data;
              await bot.answerCallbackQuery(query.id);
      
              getNews(chatId, selectedInterest, selectedLanguage);
            });
        });
    } 

    // ***REGULAR DIALOGUE***
    else {
        if (msg.photo && msg.photo.length > 0 && msg.photo[msg.photo.length - 1].file_id) {
            bot.sendMessage(chatId, 'To work with a photo, use the /generate command');
        } 
        else {
            const processingMsg = await bot.sendMessage(chatId, '...');
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

async function getNews(chatId, interests, language, pageSize = 10) {
    try {
        const response = await axios.get(`https://newsapi.org/v2/everything?language=${language}&q=${interests}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${newsApiKey}`);
        const articles = response.data.articles;

        if (articles.length === 0) {
            bot.sendMessage(chatId, 'No articles found for your interests');
            return;
        }

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            const message = `${article.title}\n\n${formatDate(article.publishedAt)}\n${article.url}\n\n`;
            bot.sendMessage(chatId, message);
        };

    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Sorry, something went wrong while fetching the news. Please try again later.');
    }
}

bot.on('polling_error', async (error) => {
    console.error(error);
});

function formatDate(date) {
    let init = date.substring(0, 10);
    let year = init.substring(2, 4);
    let month = init.substring(5, 7);
    let day = init.substring(8, 10);
    let res = `${day}.${month}.${year}`;
    return res;
}