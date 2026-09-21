const { Telegraf } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);
const MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"];

let waSock = null; // global sock so Telegram can use it

const SYSTEM_PROMPT = `You are Rimuru-AI, created by Master Ivan.`;

async function askGemini(p){
  for(const m of MODELS){
    try{
      const model = genAI.getGenerativeModel({ model: m, systemInstruction: SYSTEM_PROMPT });
      const r = await model.generateContent(p);
      return r.response.text();
    }catch(e){ continue; }
  }
  return "Busy small, try again 😅";
}

// TELEGRAM
bot.start(c=>c.reply("Rimuru-AI online ✅ Send /pair 2348012345678"));
bot.on('text', async ctx=>{
  const text = ctx.message.text;

  if(text.startsWith('/pair')){
    const number = text.split(' ')[1]?.replace(/[^0-9]/g,'');
    if(!number) return ctx.reply("Usage: /pair 2348012345678");

    if(!waSock){
      return ctx.reply("WhatsApp bot never start yet, wait 10 secs and try again");
    }

    try{
      await ctx.reply(`Generating code for ${number}... wait ⏳`);
      const code = await waSock.requestPairingCode(number);
      return ctx.reply(
        `✅ YOUR PAIRING CODE:\n\n*${code}*\n\nGo WhatsApp > Linked Devices > Link with phone number > Enter this code\nCode dey expire in 60 seconds!`,
        { parse_mode: "Markdown" }
      );
    }catch(e){
      return ctx.reply("Error: " + e.message + "\nTry /pair again");
    }
  }

  ctx.reply(await askGemini(text));
});
bot.launch();

// WHATSAPP
async function startWA(){
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });
  waSock = sock; // save am globally

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', u=>{
    if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startWA();
    if(u.connection==='open') console.log("WhatsApp Connected ✅");
  });
  sock.ev.on('messages.upsert', async ({messages})=>{
    const m = messages[0];
    if(!m.message || m.key.fromMe) return;
    const t = m.message.conversation || m.message.extendedTextMessage?.text;
    if(!t) return;
    await sock.sendMessage(m.key.remoteJid, {text: await askGemini(t)});
  });
}
startWA();

require('http').createServer((_,r)=>r.end("Bot Alive")).listen(process.env.PORT||10000);
