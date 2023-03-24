const TelegramApi = require('node-telegram-bot-api');
const OpenAI = require('openai-api');
const axios = require('axios');

require('dotenv').config();


const token = process.env.TELEGRAM_BOT_TOKEN;
const newsApiKey = process.env.NEWS_API_KEY;
const openai = new OpenAI(process.env.OPENAI_API_KEY);
let isCommand = false;
const bot = new TelegramApi(token, { polling: true });

const subscribers = {};

const commands = [
    { command: '/start', description: 'Start the bot' },
    { command: '/help', description: 'Get help with the bot' },
    { command: '/news', description: 'Get news for a selected topic' },
    { command: '/subscribe', description: 'Subscribe to newsletter by interest' },
    { command: '/unsubscribe', description: 'Unsubscribe from the newsletter' },
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
        \n/news - get news for a selected topic\n/subscribe - subscribe to newsletter by interest\n/unsubscribe - unsubscribe from the newsletter
        \n/generate - photo generation by description (beta)\n/photo - generates similar photos based on the sent (beta)
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

    // ***SUBSCRIBE***
    else if(messageText.startsWith('/subscribe') || messageText.startsWith('/ыгиыскшиу')){
        isCommand = true;

        if (isSubscribed(chatId)) {
            bot.sendMessage(chatId, 'You are already subscribed to the news, use the /unsubscribe command to unsubscribe!');
            return;
        }

        if (isCommand) {
            bot.sendMessage(chatId, 'Enter interests separated by commas (for example, technology, sports)');
            bot.once('message', async (msg) => {
                const interests = msg.text.split(',').map((interest) => interest.trim());

                bot.sendMessage(chatId, 'In what language do you want to read the news?', {
                    reply_markup: {
                        inline_keyboard: [[{ text: 'English', callback_data: 'en' }, { text: 'Russian', callback_data: 'ru' }, { text: 'Spanish', callback_data: 'es' }]]
                    }
                });

                bot.on('callback_query', (query) => {
                    const language = query.data;
                    for (const interest of interests) {
                        if (subscribers[interest]) {
                            subscribers[interest].chatIds.push(chatId);
                        } else {
                            subscribers[interest] = {
                                language: language,
                                chatIds: [chatId]
                            };
                        }
                    }
                    isCommand = false;
                    bot.sendMessage(chatId, 'You have subscribed to the news!');
                })
            })
        }
    }

    // ***UnSUBSCRIBE***
    else if(messageText.startsWith('/unsubscribe') || messageText.startsWith('/гтыгиыскшиу')){
        if (isSubscribed(chatId)) {
            bot.sendMessage(chatId, 'Are you sure you want to unsubscribe from the newsletter?', {
                reply_markup: {
                inline_keyboard: [
                    [{ text: 'Yes', callback_data: 'yes' }, { text: 'No', callback_data: 'no' }]
                ]
                }
            });
            
            bot.on('callback_query', (query) => {
                const data = query.data;
                if (data === 'yes') {
                // Удаляем chatId пользователя из всех списков рассылки
                for (const interest in subscribers) {
                    const chatIds = subscribers[interest].chatIds;
                    const index = chatIds.indexOf(chatId);
                    if (index !== -1) {
                    chatIds.splice(index, 1);
                    }
                }
                bot.sendMessage(chatId, 'You have successfully unsubscribed!');
                } else {
                bot.sendMessage(chatId, 'Canceled');
                }
            });
        }
        else{
            bot.sendMessage(chatId, 'You don\'t have any subscriptions');
        }
    }

    // ***REGULAR DIALOGUE***
    else {
        if (msg.photo && msg.photo.length > 0 && msg.photo[msg.photo.length - 1].file_id) {
            bot.sendMessage(chatId, 'To work with a photo, use the /generate command');
        } 
        else {
            if(!isCommand){
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

async function sendNewsToSubscribers() {
    try {
        const interests = Object.keys(subscribers);
        for (const interest of interests) {
        const language = subscribers[interest].language;
        const chatIds = subscribers[interest].chatIds;
        const response = await axios.get(`https://newsapi.org/v2/everything?language=${language}&q=${interest}&apiKey=${newsApiKey}`);
        const articles = response.data.articles;
      
        if (articles.length === 0) {
          continue;
        }
      
        const randomIndex = Math.floor(Math.random() * articles.length);
        const article = articles[randomIndex];
        const message = `${article.title}\n\n${formatDate(article.publishedAt)}\n${article.url}\n\n`;
      
        for (const chatId of chatIds) {
          bot.sendMessage(chatId, message);
        }
      } 
    } catch (error) {
        console.error(error);
    }
}
setInterval(sendNewsToSubscribers, 1000);

function isSubscribed(chatId) {
    for (const interest in subscribers) {
      if (subscribers[interest].chatIds.includes(chatId)) {
        return true;
      }
    }
    return false;
}

function formatDate(date) {
    let init = date.substring(0, 10);
    let year = init.substring(2, 4);
    let month = init.substring(5, 7);
    let day = init.substring(8, 10);
    let res = `${day}.${month}.${year}`;
    return res;
}

bot.on('polling_error', async (error) => {
    console.error(error);
});
bot.on('webhook_error', (error) => {
    console.log(error);
});
