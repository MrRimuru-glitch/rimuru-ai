const { Telegraf } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);
const MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"];

const SYSTEM_PROMPT = `You are Rimuru-AI, created by Master Ivan. You are NOT Gemini.`;

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
bot.start(c=>c.reply("Rimuru-AI online ✅ Send /pair 2348012345678 to link WhatsApp"));
bot.on('text', async c=>{
  const text = c.message.text;

  // PAIR COMMAND FOR WHATSAPP
  if(text.startsWith('/pair')){
    const number = text.split(' ')[1];
    if(!number) return c.reply("Usage: /pair 2348012345678\nInclude country code, no + or spaces");
    // Save number to file so WA bot can read it
    require('fs').writeFileSync('./number.txt', number);
    return c.reply(`Number saved: ${number}\nNow go check Render Logs, pairing code go show in 10 seconds. Then go WhatsApp > Linked Devices > Link with phone number > enter code.`);
  }

  c.reply(await askGemini(text));
});
bot.launch();

// WHATSAPP WITH PAIRING CODE
async function startWA(){
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async u=>{
    const { connection, lastDisconnect } = u;
    if(connection==='close' && lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startWA();
    if(connection==='open') console.log("WhatsApp Connected ✅");
  });

  // If not registered, request pairing code
  if(!state.creds.registered){
    setTimeout(async ()=>{
      try{
        let num = "";
        try{ num = require('fs').readFileSync('./number.txt','utf8').trim(); }catch{}
        if(!num) num = process.env.PHONE_NUMBER || "";
        if(!num){
          console.log("NO NUMBER YET! Send /pair 234... on Telegram or set PHONE_NUMBER env");
          return;
        }
        const code = await sock.requestPairingCode(num.replace(/[^0-9]/g,''));
        console.log(`\n\n=== PAIRING CODE FOR ${num}: ${code} ===\nGo to WhatsApp > Linked Devices > Link with phone number\n\n`);
      }catch(e){ console.log("Pair error:", e.message); }
    }, 5000);
  }

  sock.ev.on('messages.upsert', async ({messages})=>{
    const m = messages[0];
    if(!m.message || m.key.fromMe) return;
    const t = m.message.conversation || m.message.extendedTextMessage?.text;
    if(!t) return;
    await sock.sendMessage(m.key.remoteJid, {text: await askGemini(t)});
  });
}
startWA();

require('http').createServer((_,r)=>r.end("Both + Pair Alive")).listen(process.env.PORT||10000);
