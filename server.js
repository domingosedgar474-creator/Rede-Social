const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 10000;

const uploadDir = path.join(__dirname, 'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/upload', upload.single('video'), (req, res) => {
  if(!req.file) return res.json({ error: 'sem ficheiro' });
  res.json({ url: '/uploads/' + req.file.filename });
});

app.get('/videos', (req, res) => {
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

app.listen(PORT, () => console.log('Nick a correr na porta ' + PORT));
