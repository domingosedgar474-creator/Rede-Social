const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(require('cors')());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// --- NOVO: GUARDAR EM FICHEIRO PARA NÃO APAGAR ---
const DATA_FILE = 'data.json';
let data = { messages: [], videos: [] };
if (fs.existsSync(DATA_FILE)) {
  try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e){}
}
let messages = data.messages;
let videos = data.videos;

function salvar() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ messages, videos }));
}
// --- FIM DO NOVO ---

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req,file,cb)=>cb(null, Date.now()+path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 100*1024*1024 } });

app.post('/upload', upload.single('video'), (req,res)=>{
  if(!req.file) return res.status(400).json({error:'sem ficheiro'});
  const v = { id: Date.now(), url: '/uploads/'+req.file.filename, name: req.file.originalname, user: req.body.user||'anon' };
  videos.unshift(v); salvar(); io.emit('newVideo', v); res.json(v);
});
app.get('/videos', (req,res)=>res.json(videos));
app.get('/messages', (req,res)=>res.json(messages));
io.on('connection', socket=>{
  socket.on('chat', data=>{
    const msg = { ...data, time: new Date().toLocaleTimeString(), id: Date.now() };
    messages.push(msg); if(messages.length>200) messages.shift(); salvar(); io.emit('chat', msg);
  });
  socket.on('audio', data=>{
    messages.push(data); salvar(); io.emit('chat', data);
  });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log('Rodando '+PORT));
