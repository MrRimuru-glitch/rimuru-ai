const { Telegraf } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Jimp = require('jimp');

console.log("Starting KING AI v7.0...");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);
let waSock = null;

// GEMINI AI
async function askGemini(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch { return "AI busy small, try again 😅"; }
}

// KING AI CARD GENERATOR - like your screenshot
async function kingCard(ppUrl, name, squad, remain, actionText) {
  try {
    let img;
    try { img = await Jimp.read(ppUrl); }
    catch { img = await Jimp.read('https://i.imgur.com/4QfKuz1.jpg'); }

    img.resize(720, 900);
    const dark = new Jimp(720, 900, '#000000');
    dark.opacity(0.5);
    img.composite(dark, 0, 0);

    const box = new Jimp(720, 320, '#0a0a0a');
    img.composite(box, 0, 580);

    const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const font16 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    const fontBold = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    img.print(font32, 20, 590, `── ☾ KING AI ◁ v7.0 ▷ ☽ ──✦`);
    img.print(font16, 20, 640, `| X ${actionText}`);
    img.print(font16, 20, 680, `-------------------------------------------------`);
    img.print(font16, 20, 720, `❖ NAME ↝ ${name}`);
    img.print(font16, 20, 750, `❖ SQUAD ↝ ${squad}`);
    img.print(font16, 20, 780, `❖ REMAIN ↝ ${remain}`);

    return await img.getBufferAsync(Jimp.MIME_JPEG);
  } catch (e) { console.log("Card error", e.message); return null; }
}

// TELEGRAM PART
bot.start((ctx) => ctx.reply("KING AI v7.0 Online 👑\n\n/pair 2348012345678 - link WhatsApp\nJust chat - AI go reply"));

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/pair')) {
    const num = text.split(' ')[1]?.replace(/[^0-9]/g, '');
    if (!num) return ctx.reply("Usage: /pair 2348012345678");
    if (!waSock) return ctx.reply("WhatsApp never ready, wait 15sec try again");
    try {
      await ctx.reply(`Generating code for ${num}... ⏳`);
      const code = await waSock.requestPairingCode(num);
      return ctx.reply(`✅ YOUR CODE: *${code}*\n\nGo WhatsApp > Settings > Linked Devices > Link with phone number > Enter code\nExpires in 60sec!`, { parse_mode: "Markdown" });
    } catch (err) { return ctx.reply("Error: " + err.message); }
  }
  ctx.reply(await askGemini(text));
});
bot.launch().then(() => console.log("Telegram ✅"));

// WHATSAPP PART
async function startWA() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });
  waSock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'close') {
      console.log("WA closed");
      if (lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) setTimeout(startWA, 3000);
    }
    if (connection === 'open') console.log("WhatsApp Connected ✅");
  });

  // GOODBYE / WELCOME - like MICHIKO BOTS
  sock.ev.on('group-participants.update', async (anu) => {
    try {
      const groupMeta = await sock.groupMetadata(anu.id);
      const groupName = groupMeta.subject;
      const remain = groupMeta.participants.length;

      for (let num of anu.participants) {
        let pp;
        try { pp = await sock.profilePictureUrl(num, 'image'); }
        catch { pp = 'https://i.imgur.com/4QfKuz1.jpg'; }

        if (anu.action === 'remove') {
          const card = await kingCard(pp, `@${num.split('@')[0]}`, groupName, remain, "A SOUL LEAVES THE SOUL SOCIETY");
          if (card) await sock.sendMessage(anu.id, { image: card, mentions: [num] });
        }
        if (anu.action === 'add') {
          const card = await kingCard(pp, `@${num.split('@')[0]}`, groupName, remain, "A NEW SOUL ENTERS THE SOUL SOCIETY");
          if (card) await sock.sendMessage(anu.id, { image: card, mentions: [num] });
        }
      }
    } catch (e) { console.log("Group update error", e.message); }
  });

  // AI CHAT
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m?.message || m.key.fromMe) return;
    if (m.key.remoteJid.includes('@g.us') &&!m.message.extendedTextMessage?.text?.includes('@')) return; // ignore group chat unless tagged
    const t = m.message.conversation || m.message.extendedTextMessage?.text;
    if (!t) return;
    const reply = await askGemini(t);
    await sock.sendMessage(m.key.remoteJid, { text: reply }, { quoted: m });
  });
}
startWA();

require('http').createServer((_, res) => res.end("KING AI v7.0 Alive")).listen(process.env.PORT || 
