const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

let videos = [];
let mensagens = [];

const PROIBIDO = ['xxx','porn','porno','hentai','nudes','nude','sexo','sex','onlyfans','xvideos','pornhub'];
function temProibido(t){
  if(!t) return false;
  t = t.toLowerCase();
  return PROIBIDO.some(p => t.includes(p));
}

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.get('/health', (req,res) => res.send('OK'));

// VIDEOS
app.get('/videos', (req,res) => res.json(videos.filter(v => v.aprovado)));
app.get('/admin-videos', (req,res) => res.json(videos));

app.post('/upload', upload.single('video'), (req,res) => {
  const legenda = req.body.legenda || '';
  if (temProibido(legenda + ' ' + (req.file ? req.file.originalname : ''))) {
    if(req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Proibido' });
  }
  const novo = { id: Date.now(), url: '/uploads/' + req.file.filename, legenda, aprovado: false, denuncias: 0 };
  videos.push(novo);
  res.json({ ok: true, video: novo });
});

app.post('/aprovar/:id', (req,res) => { const v=videos.find(x=>x.id==req.params.id); if(v) v.aprovado=true; res.json({ok:true}); });
app.post('/apagar/:id', (req,res) => { const i=videos.findIndex(x=>x.id==req.params.id); if(i>=0){ try{fs.unlinkSync(path.join(__dirname, videos[i].url))}catch(e){} videos.splice(i,1);} res.json({ok:true}); });
app.post('/denunciar/:id', (req,res) => { const v=videos.find(x=>x.id==req.params.id); if(v){ v.denuncias++; if(v.denuncias>=3){ try{fs.unlinkSync(path.join(__dirname, v.url))}catch(e){} videos=videos.filter(x=>x.id!=v.id); } } res.json({ok:true}); });

// MENSAGENS
app.get('/mensagens', (req,res) => res.json(mensagens));

app.post('/mensagem', (req,res) => {
  const { nome, texto } = req.body;
  if(!texto || temProibido(texto)) return res.status(400).json({ error: 'Proibido' });
  const m = { id: Date.now(), nome: nome || 'Anónimo', tipo: 'texto', texto };
  mensagens.push(m);
  if(mensagens.length > 200) mensagens.shift();
  res.json({ ok: true });
});

// ÁUDIO - MICRO
app.post('/mensagem-audio', upload.single('audio'), (req,res) => {
  if(!req.file) return res.status(400).json({ error: 'Sem audio' });
  const m = { id: Date.now(), nome: req.body.nome || 'Anónimo', tipo: 'audio', url: '/uploads/' + req.file.filename };
  mensagens.push(m);
  if(mensagens.length > 200) mensagens.shift();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('A correr na porta ' + PORT));
