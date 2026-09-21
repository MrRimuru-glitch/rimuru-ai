const { Telegraf } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const bot = new Telegraf(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  systemInstruction: "You are Rimuru-AI, a helpful, friendly AI assistant. Speak only in pure, clear, professional English. No pidgin. Be concise and helpful."
});

bot.start((ctx) => ctx.reply("I'm up! Hey I am Rimuru-AI. How can I help you today?"));

bot.on('text', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const result = await model.generateContent(ctx.message.text);
    const response = await result.response;
    await ctx.reply(response.text());
  } catch (e) {
    console.log(e);
    await ctx.reply("An error occurred: " + e.message);
  }
});

bot.launch();
console.log("Rimuru-AI running in pure English mode...");

require('http').createServer((req, res) => res.end("Rimuru is alive!")).listen(process.env.PORT || 10000);
