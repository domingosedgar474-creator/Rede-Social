const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e8 });
const PORT = process.env.PORT || 10000;

// --- SUPABASE - SEM CHAVE AQUI, SÓ VEM DO RENDER ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Supabase ligado');
} else {
  console.log('Supabase sem chave - a usar memória local');
}

const uploadDir = path.join(__dirname, 'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/upload', upload.single('video'), async (req, res) => {
  if(!req.file) return res.json({ error: 'sem ficheiro' });
  const url = '/uploads/' + req.file.filename;
  if (supabase) {
    await supabase.from('videos').insert([{ url }]);
  }
  res.json({ url });
});

app.get('/videos', async (req, res) => {
  if (supabase) {
    const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
    if (data) return res.json(data);
  }
  fs.readdir(uploadDir, (err, files) => {
    if(err) return res.json([]);
    res.json(files.map(f => ({ url: '/uploads/' + f })).reverse());
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.send('OK');
});

// --- CHAT / GAVETA DE MENSAGENS ---
let messages = [];
async function carregarMensagens() {
  if (!supabase) return;
  const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(200);
  if (data) messages = data.map(m => m.content);
}
carregarMensagens();

io.on('connection', (socket) => {
  socket.emit('mensagens-iniciais', messages);
  socket.on('mensagem', async (msg) => {
    messages.push(msg);
    if (supabase) await supabase.from('messages').insert([{ content: msg }]);
    io.emit('mensagem', msg);
  });
  socket.on('mensagem-audio', async (msg) => {
    messages.push(msg);
    if (supabase) await supabase.from('messages').insert([{ content: msg }]);
    io.emit('mensagem-audio', msg);
  });
});

server.listen(PORT, () => console.log('Nick a correr na porta ' + PORT));
