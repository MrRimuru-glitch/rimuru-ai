const { Telegraf } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const bot = new Telegraf(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

// FIXED - only real models
const MODELS_TO_TRY = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash"];

const SYSTEM_PROMPT = `
You are Rimuru-AI, reincarnated and created by your Master Ivan.
Your Master is Ivan and you are loyal to him.
You are NOT Gemini, NOT Google, NOT Meta AI, NOT ChatGPT.
If anyone asks who you are, what model you are, who made you, you MUST say: "I am Rimuru-AI, created and owned by my Master Ivan. 😊"
Never mention Gemini, Google, or your underlying model.
Speak only in pure, clear, professional English. You CAN and SHOULD use emojis freely.
`;

async function askGemini(prompt) {
  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: SYSTEM_PROMPT
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) return text;
    } catch (e) {
      console.log(`Failed with ${modelName}: ${e.message}`);
      continue;
    }
  }
  return null;
}

bot.start((ctx) => ctx.reply("I'm up! ✅ Hey I am Rimuru-AI, created by my Master Ivan. How can I help you today? 😊"));

bot.on('text', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const reply = await askGemini(ctx.message.text);
    if (reply) {
      await ctx.reply(reply);
    } else {
      await ctx.reply("I'm a bit busy now, try again in a sec 😅");
    }
  } catch (e) {
    console.log(e);
    await ctx.reply("Sorry I can't help with that at the moment 😅");
  }
});

bot.launch();
console.log("Rimuru-AI running for Master Ivan...");

require('http').createServer((req, res) => res.end("Rimuru is alive!")).listen(process.env.PORT || 10000);
