const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log('Um usuário conectou');

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg); 
    });

    socket.on('disconnect', () => {
        console.log('Um usuário desconectou');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
