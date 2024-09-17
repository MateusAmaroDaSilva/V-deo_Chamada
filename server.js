const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const fs = require('fs'); // Para ler arquivos

const app = express();
const server = http.createServer(app);

const allowedOrigins = ['https://video-chamada.vercel.app', 'http://localhost:3000'];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Nova rota para fornecer o resumo da reunião
app.get('/api/summary', (req, res) => {
    // Aqui você pode integrar com a IA que gera o resumo
    // Para fins de exemplo, vou ler um arquivo fictício `summary.txt`
    fs.readFile('summary.txt', 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o resumo:', err);
            res.status(500).send('Erro ao gerar o resumo.');
        } else {
            res.send(data);
        }
    });
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
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
