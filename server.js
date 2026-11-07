const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e8 });

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.send('OK');
});

let posts = [];
let messages = [];

io.on('connection', (socket) => {
  socket.emit('posts-iniciais', posts);
  socket.emit('mensagens-iniciais', messages);

  socket.on('novo-post', (post) => {
    post.aprovado = false;
    post.id = Date.now();
    posts.push(post);
    io.emit('novo-post', post);
  });

  socket.on('aprovar-post', (id) => {
    const p = posts.find(x => x.id == id);
    if (p) p.aprovado = true;
    io.emit('post-aprovado', id);
  });

  socket.on('apagar-post', (id) => {
    posts = posts.filter(x => x.id != id);
    io.emit('post-apagado', id);
  });

  socket.on('mensagem', (msg) => {
    messages.push(msg);
    io.emit('mensagem', msg);
  });

  socket.on('mensagem-audio', (msg) => {
    messages.push(msg);
    io.emit('mensagem-audio', msg);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('A correr na porta ' + PORT));
