const { Telegraf } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const bot = new Telegraf(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

bot.start((ctx) => ctx.reply("Yo! Rimuru-AI don wake up! 🔥 Ask me anything."));

bot.on('text', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const result = await model.generateContent(ctx.message.text);
    const response = await result.response;
    await ctx.reply(response.text());
  } catch (e) {
    console.log(e);
    await ctx.reply("Omo error occur: " + e.message);
  }
});

bot.launch();
console.log("Rimuru-AI running...");

// For Render to not sleep
require('http').createServer((req, res) => res.end("Rimuru is alive!")).listen(process.env.PORT || 10000);
