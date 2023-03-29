const TelegramApi = require('node-telegram-bot-api');
const OpenAI = require('openai-api');
const axios = require('axios');
const Web3 = require('web3')
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramApi(token, { polling: true });
const openai = new OpenAI(process.env.OPENAI_API_KEY);

const infuraProjectId = process.env.INFURA_PROJECT_ID;
const web3 = new Web3(`https://mainnet.infura.io/v3/${infuraProjectId}`);

const newsApiKey = process.env.NEWS_API_KEY;
let isCommand = false;

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

// if (web3.eth.currentProvider.connected) {
//     console.log('Подключено к узлу Ethereum');
//   } else {
//     console.log('Нет подключения к узлу Ethereum');
// }
// web3.eth.getBlockNumber((error, result) => {
//     if (error) {
//       console.error(error);
//     } else {
//       console.log(`Текущий блок: ${result}`);
//     }
// });

// web3.eth.net.isListening()
//   .then(() => console.log('Web3 is connected'))
//   .catch(e => console.log('Wow. Something went wrong'));

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

    // //***WALLET***
    // else if(messageText.startsWith('/wallet')) {
    //     handleWalletCommand()
    // }
    
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
                    { text: 'Chines', callback_data: 'zh' },
                  ],
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
    else if (messageText.startsWith('/subscribe') || messageText.startsWith('/подписаться')) {
        isCommand = true;

        if(isCommand){
            if (isSubscribed(chatId)) {
                bot.sendMessage(chatId, 'You are already subscribed to the news, use the /unsubscribe command to unsubscribe!');
                return;
            }
            
            bot.sendMessage(chatId, 'Enter interests separated by commas (for example, technology, sports)');
            bot.once('message', async (msg) => {
                    const interests = msg.text.split(',').map((interest) => interest.trim());
                
                    if (interests.length === 0) {
                        bot.sendMessage(chatId, 'You have to enter at least one interest to subscribe');
                        return;
                    }
                
                    bot.sendMessage(chatId, 'In what language do you want to read the news?', {
                        reply_markup: {
                            inline_keyboard: [[{ text: 'English', callback_data: 'en' }, { text: 'Russian', callback_data: 'ru' }, { text: 'Spanish', callback_data: 'es' }]]
                        }
                    });
                
                    bot.on('callback_query', (query) => {
                    const language = query.data;
                
                    for (const interest of interests) {
                        if (subscribers[interest]) {
                        // Если пользователь уже подписан на данный интерес, то добавляем его chatId в массив chatIds
                        if (!subscribers[interest].chatIds.includes(chatId)) {
                            subscribers[interest].chatIds.push(chatId);
                        }
                        } else {
                        // Если пользователь подписывается на интерес впервые, то создаем новую запись
                        subscribers[interest] = {
                            language: language,
                            chatIds: [chatId]
                        };
                        }
                    }
                
                    bot.sendMessage(chatId, 'You have successfully subscribed to the news!');
                    console.log(subscribers);
                
                    // Очищаем обработчики событий, чтобы не накапливались при каждой новой подписке
                    bot.removeReplyListener();
                    bot.removeAllListeners('callback_query');
                });
            });
        }
    }
  
  // ***UNSUBSCRIBE***
//   else if (messageText.startsWith('/unsubscribe')) {
//     if (isSubscribed(chatId)) {
//         bot.sendMessage(chatId, 'Enter interests separated by commas (for example, technology, sports)');
//         bot.once('message', async (msg) => {
//                 const interests = msg.text.split(',').map((interest) => interest.trim());
//                 for (const interest of interests) {
//                     const index = subscribers[interest].chatIds.indexOf(chatId);
//                     if (index !== -1) {
//                     subscribers[interest].chatIds.splice(index, 1);

//                     // Если после отписки chatIds стал пустым, то удаляем интерес из объекта subscribers
//                     if (subscribers[interest].chatIds.length === 0) {
//                         delete subscribers[interest];
//                     }
//                     }
//                 }
//                 bot.sendMessage(chatId, 'You have successfully unsubscribed!');
//                 console.log(subscribers);
//         })
//     } else {
//         bot.sendMessage(chatId, 'You are not subscribed to any newsletters');
//     }         
//   }   

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

async function handleWalletCommand(msg) {
    isCommand = true;
    try {
      // Check if Web3 is connected to the network
      const isWeb3Connected = await web3.eth.net.isListening();
      if (!isWeb3Connected) {
        throw new Error('Web3 is not connected');
      }
  
      // Ask user for wallet address
      await bot.sendMessage(msg.chat.id, 'Please enter your wallet address');
  
      // Wait for user's response
      const response = await bot.onReplyToMessage(msg.chat.id, msg.message_id, async (reply) => {
        const walletAddress = reply.text;
  
        // Get user's ETH balance
        const balance = await web3.eth.getBalance(walletAddress);
        const balanceInEth = web3.utils.fromWei(balance, 'ether');
  
        // Send balance to user
        const response = `Your ETH balance is ${balanceInEth}`;
        await bot.sendMessage(msg.chat.id, response);
      });
    } catch (e) {
      console.error(e);
      await bot.sendMessage(msg.chat.id, 'Sorry, something went wrong');
    }
}

bot.onText(/\/wallet/, handleWalletCommand);


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
setInterval(sendNewsToSubscribers, 1200000);

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
