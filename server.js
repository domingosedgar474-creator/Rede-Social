const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

let videos = [];
let mensagens = [];
if (fs.existsSync("data.json")) {
  try {
    const d = JSON.parse(fs.readFileSync("data.json", "utf8"));
    videos = d.videos || [];
    mensagens = d.mensagens || [];
  } catch (e) { videos = []; mensagens = []; }
}

function salvar() {
  try {
    fs.writeFileSync("data.json", JSON.stringify({ videos, mensagens }));
  } catch (e) { console.log("Erro ao salvar", e); }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const nome = Date.now() + "-" + Math.round(Math.random() * 100000) + path.extname(file.originalname || ".mp4");
    cb(null, nome);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.get("/videos", (req, res) => {
  res.json(videos);
});

app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) return res.json({ error: "Sem ficheiro" });
  const novo = {
    id: Date.now(),
    url: "/uploads/" + req.file.filename,
    user: req.body.user || "Nick",
    date: new Date().toISOString()
  };
  videos.push(novo);
  salvar();
  res.json(novo);
});

app.get("/zerar", (req, res) => {
  videos = [];
  mensagens = [];
  try { fs.writeFileSync("data.json", JSON.stringify({ videos: [], mensagens: [] })); } catch (e) {}
  try {
    fs.readdirSync("uploads").forEach(f => {
      try { fs.unlinkSync(path.join("uploads", f)); } catch (e) {}
    });
  } catch (e) {}
  res.send("ZERADO - agora está 0");
});

app.get("/health", (req, res) => res.send("OK"));

app.listen(PORT, () => console.log("Nick a correr na porta " + PORT));
