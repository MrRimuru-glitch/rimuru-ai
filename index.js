const { Telegraf } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log("Starting bot...");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);
let waSock = null;

async function askGemini(p){
  try{
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const r = await model.generateContent(p);
    return r.response.text();
  }catch(e){
    return "Try again small 😅";
  }
}

bot.start((ctx)=>ctx.reply("Rimuru-AI online ✅ /pair 234..."));
bot.on('text', async (ctx)=>{
  const text = ctx.message.text;
  if(text.startsWith('/pair')){
    const num = text.split(' ')[1]?.replace(/[^0-9]/g,'');
    if(!num) return ctx.reply("Usage: /pair 2349068175448");
    if(!waSock) return ctx.reply("WhatsApp never ready, wait 15 sec try again");
    try{
      await ctx.reply("Generating code for "+num+" ⏳");
      const code = await waSock.requestPairingCode(num);
      return ctx.reply(`CODE: ${code}\n\nWhatsApp > Linked Devices > Link with phone number`);
    }catch(err){
      return ctx.reply("Error: "+err.message);
    }
  }
  ctx.reply(await askGemini(text));
});

bot.launch().then(()=>console.log("Telegram ✅"));

async function startWA(){
  try{
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({ auth: state });
    waSock = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u)=>{
      if(u.connection==='close'){
        console.log("WA close, restarting...");
        if(u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) setTimeout(startWA, 3000);
      }
      if(u.connection==='open') console.log("WA Connected ✅");
    });
    sock.ev.on('messages.upsert', async ({messages})=>{
      const m = messages[0];
      if(!m?.message || m.key.fromMe) return;
      const t = m.message.conversation || m.message.extendedTextMessage?.text;
      if(!t) return;
      const reply = await askGemini(t);
      await sock.sendMessage(m.key.remoteJid, {text: reply});
    });
  }catch(e){ console.log("WA error", e.message); setTimeout(startWA, 5000); }
}
startWA();

require('http').createServer((_,r)=>r.end("Alive")).listen(process.env.PORT||10000, ()=>console.log("Server alive"));
