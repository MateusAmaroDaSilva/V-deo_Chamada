const express = require("express");
const fs = require("fs");
const path = require("path");
const record = require("node-record-lpcm16");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const port = 3000;

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

// Rota para iniciar a gravação
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

// Rota para parar a gravação
app.get("/stop-recording", (req, res) => {
  try {
    if (!recordingProcess) {
      return res.status(400).json({ message: "Nenhuma gravação em andamento." });
    }

    recordingProcess.stop();
    recordingProcess = null;

    res.json({ message: "Gravação parada." });
  } catch (err) {
    logError("Erro ao parar a gravação", err);
    res.status(500).json({ message: "Erro ao parar a gravação.", error: err.message });
  }
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

// Inicialização do servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
