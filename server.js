const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch'); // Adicione isto para enviar o áudio para uma API de transcrição

const app = express();
const server = http.createServer(app);

const allowedOrigins = ['https://video-chamada.vercel.app', 'http://localhost:3000'];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' })); // Adicione isto para lidar com grandes cargas úteis de áudio

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get the meeting summary
app.get('/api/summary', (req, res) => {
    const filePath = path.join(__dirname, 'summary.txt');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o resumo:', err);
            return res.status(500).send('Erro ao gerar o resumo.');
        }
        res.send(data);
    });
});

// API endpoint to transcribe audio
app.post('/transcribe', async (req, res) => {
    const { audioStreamURL } = req.body;

    try {
        // Fetch the audio file from the URL
        const response = await fetch(audioStreamURL);
        const audioBuffer = await response.buffer();

        // Aqui você pode usar a API de transcrição de sua escolha. Exemplo com Google Cloud:
        const apiKey = 'YOUR_GOOGLE_CLOUD_API_KEY'; // Substitua com sua chave API
        const googleApiUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;

        const transcriptionResponse = await fetch(googleApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: 'en-US'
                },
                audio: {
                    content: audioBuffer.toString('base64')
                }
            })
        });

        const transcriptionData = await transcriptionResponse.json();
        const transcript = transcriptionData.results.map(result => result.alternatives[0].transcript).join('\n');

        res.json({ text: transcript });
    } catch (error) {
        console.error('Erro ao transcrever áudio:', error);
        res.status(500).send('Erro ao transcrever áudio.');
    }
});

let userCount = 1;

io.on('connection', (socket) => {
    const userName = `Usuario${String(userCount).padStart(2, '0')}`;
    userCount++;

    console.log(`${userName} entrou.`);

    socket.emit('user name', userName);

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log(`${userName} saiu.`);
        // Additional logic to handle meeting end can go here
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
