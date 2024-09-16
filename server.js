const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

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
