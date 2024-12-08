const express = require("express");
const fs = require("fs");
const path = require("path");
const record = require("node-record-lpcm16"); 
const app = express();
const port = 3000;

let recordingProcess = null;

const audioFolder = path.join(__dirname, "audio"); 

if (!fs.existsSync(audioFolder)) {
  fs.mkdirSync(audioFolder, { recursive: true });
  console.log("Pasta 'audio' criada.");
}

const logError = (context, error) => {
  console.error(`[${context}]`, error.message || error);
};

app.get("/start-recording", (req, res) => {
  try {
    if (recordingProcess) {
      return res.status(400).json({ message: "Já existe uma gravação em andamento." });
    }

    const fileName = `audio_${Date.now()}.wav`; 
    const filePath = path.join(audioFolder, fileName); 

    console.log(`Iniciando gravação: ${filePath}`);

    const stream = fs.createWriteStream(filePath);
    recordingProcess = record
      .start({
        sampleRateHertz: 16000,
        threshold: 0, 
        silence: 0, 
      })
      .on("error", (err) => logError("Erro durante a gravação", err))
      .pipe(stream);

    stream.on("finish", () => console.log(`Gravação salva: ${filePath}`));
    stream.on("error", (err) => logError("Erro ao salvar o arquivo", err));

    res.json({ message: "Gravação iniciada!", filePath });
  } catch (err) {
    logError("Erro ao iniciar a gravação", err);
    res.status(500).json({ message: "Erro ao iniciar a gravação.", error: err.message });
  }
});

app.get("/stop-recording", (req, res) => {
  try {
    if (!recordingProcess) {
      return res.status(400).json({ message: "Nenhuma gravação em andamento." });
    }

    recordingProcess.stop();
    recordingProcess = null;
    res.json({ message: "Gravação parada e salva." });
  } catch (err) {
    logError("Erro ao parar a gravação", err);
    res.status(500).json({ message: "Erro ao parar a gravação.", error: err.message });
  }
});

app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "public", "reuniao.html");
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send("Arquivo reuniao.html não encontrado.");
  }
  res.sendFile(indexPath);
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
