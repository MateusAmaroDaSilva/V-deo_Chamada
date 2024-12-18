const express = require("express");
const fs = require("fs");
const path = require("path");
const record = require("node-record-lpcm16");
const ffmpeg = require("fluent-ffmpeg");
const FormData = require("form-data");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); // Servidor HTTP
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Atualize conforme necessário
    methods: ["GET", "POST"],
  },
});

const port = 3000;

const cors = require("cors");
app.use(cors({ origin: "http://localhost:3000" }));

let recordingProcess = null;
const audioFolder = path.join(__dirname, "audio");

// Criar a pasta de áudio, se não existir
if (!fs.existsSync(audioFolder)) {
  fs.mkdirSync(audioFolder, { recursive: true });
  console.log("Pasta 'audio' criada.");
}

// Função para log de erros
const logError = (context, error) => {
  console.error(`[${context}]`, error.message || error);
};

// Middleware para processar JSON
app.use(express.json());

// Array para armazenar as reuniões
let meetings = [];

// Rotas para gravação de áudio
app.get("/start-recording", (req, res) => {
  try {
    if (recordingProcess) {
      return res.status(400).json({ message: "Já existe uma gravação em andamento." });
    }

    const fileName = `audio_${Date.now()}.mp3`; // Salvar diretamente como MP3
    const filePath = path.join(audioFolder, fileName);

    console.log(`Iniciando gravação: ${filePath}`);

    const stream = fs.createWriteStream(filePath);

    // Inicia a gravação e converte para MP3 em tempo real
    recordingProcess = record
      .start({
        sampleRateHertz: 16000,
        threshold: 0, // Grava tudo
        silence: 0, // Sem interrupção por silêncio
      })
      .on("error", (err) => logError("Erro durante a gravação", err));

    // Converte para MP3 em tempo real usando ffmpeg
    ffmpeg()
      .input(recordingProcess) // Fluxo de entrada
      .audioCodec("libmp3lame") // Codec MP3
      .format("mp3") // Formato de saída
      .on("error", (err) => logError("Erro ao converter para MP3", err))
      .pipe(stream);

    stream.on("finish", () => console.log(`Gravação salva como MP3: ${filePath}`));
    stream.on("error", (err) => logError("Erro ao salvar o arquivo", err));

    res.json({ message: "Gravação iniciada!", filePath });
  } catch (err) {
    logError("Erro ao iniciar a gravação", err);
    res.status(500).json({ message: "Erro ao iniciar a gravação.", error: err.message });
  }
});

app.get("/stop-recording", async (req, res) => {
  try {
    if (!recordingProcess) {
      return res.status(400).json({ message: "Nenhuma gravação em andamento." });
    }

    recordingProcess.stop();
    recordingProcess = null;

    const filePath = path.join(audioFolder, "audio.mp3");
    if (fs.existsSync(filePath)) {
      const form = new FormData();
      form.append("file", fs.createReadStream(filePath), {
        filename: "audio.mp3",
        contentType: "audio/mp3",
      });

      try {
        const response = await axios.post(
          "https://audionode.onrender.com/v1/uploadFile",
          form,
          { headers: { ...form.getHeaders() } }
        );

        console.log("Resposta da API:", response.data);

        res.json({
          message: "Gravação salva e enviada para transcrição.",
          apiResponse: response.data,
        });

        fs.unlinkSync(filePath);
      } catch (error) {
        logError("Erro ao enviar áudio para a API", error);
        res.status(500).json({ message: "Erro ao enviar áudio para a API", error: error.message });
      }
    } else {
      res.status(500).json({ message: "Erro: arquivo de áudio não encontrado." });
    }
  } catch (err) {
    logError("Erro ao parar a gravação", err);
    res.status(500).json({ message: "Erro ao parar a gravação.", error: err.message });
  }
});

// Rotas para gerenciamento de reuniões
app.post("/create-meeting", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "O nome da reunião é obrigatório." });
  }

  // Gerar reunião
  const newMeeting = {
    id: meetings.length + 1, // Se possível, substitua por um ID único, ex: uuidv4().
    name,
    createdAt: new Date(),
  };

  meetings.push(newMeeting); // Salva a reunião na lista
  console.log(`Reunião criada: ${JSON.stringify(newMeeting)}`);

  // Resposta no formato esperado pelo frontend
  res.status(201).json({ success: true, meeting: newMeeting });
});

app.get("/meetings", (req, res) => {
  res.json(meetings);
});

app.get("/meeting/:id", (req, res) => {
  const meetingId = parseInt(req.params.id);
  const meeting = meetings.find((m) => m.id === meetingId);

  if (!meeting) {
    return res.status(404).json({ error: "Reunião não encontrada." });
  }

  res.json(meeting);
});

// Configuração do chat usando Socket.IO
io.on("connection", (socket) => {
  console.log("Um usuário conectou:", socket.id);

  // Recebe mensagem do chat e transmite a todos os clientes
  socket.on("chat message", (message) => {
    console.log("Mensagem recebida:", message);
    io.emit("chat message", message);
  });

  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

// Rota para o caminho raiz
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "public", "reuniao.html");
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send("Arquivo reuniao.html não encontrado.");
  }
  res.sendFile(indexPath);
});

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, "public")));

// Inicialização do servidor (usando server com Socket.IO)
server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
