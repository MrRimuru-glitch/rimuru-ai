const { Telegraf } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const bot = new Telegraf(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const MODELS_TO_TRY = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"];

async function askGemini(prompt) {
  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: "You are Rimuru-AI. Speak only in pure, clear, professional English. You CAN and SHOULD use emojis freely to be friendly and expressive. No pidgin."
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.log(`Failed with ${modelName}: ${e.message}`);
      continue;
    }
  }
  throw new Error("All models busy");
}

bot.start((ctx) => ctx.reply("I'm up! ✅ Hey I am Rimuru-AI. How can I help you today? 😊"));

bot.on('text', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const reply = await askGemini(ctx.message.text);
    await ctx.reply(reply);
  } catch (e) {
    console.log(e);
    await ctx.reply("Sorry I can't help with that");
  }
});

bot.launch();
console.log("Rimuru-AI running...");

require('http').createServer((req, res) => res.end("Rimuru is alive!")).listen(process.env.PORT || 10000);
