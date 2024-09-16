const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const allowedOrigins = ['https://video-chamada.vercel.app', 'http://localhost:3000'];

// Configurando o CORS no Express
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));

// Configurando o Socket.io com CORS
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

let userCount = 1; // Contador de usuários para nomeação incremental

// Lógica do Socket.io
io.on('connection', (socket) => {
    // Atribui o nome ao usuário conforme o contador
    const userName = `Usuario${String(userCount).padStart(2, '0')}`;
    userCount++;

    console.log(`${userName} entrou.`);

    // Envia o nome de usuário para o cliente
    socket.emit('user name', userName);

    // Receber mensagens do cliente e retransmitir
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    // Log quando o usuário se desconectar
    socket.on('disconnect', () => {
        console.log(`${userName} saiu.`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
