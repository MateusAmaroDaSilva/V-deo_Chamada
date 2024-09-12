const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve os arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal para servir o HTML
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Lida com conexões WebSocket
io.on('connection', (socket) => {
    console.log('Um usuário conectou');

    // Evento para receber e enviar mensagens de chat
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg); // Envia a mensagem para todos os usuários conectados
    });

    // Quando o usuário desconecta
    socket.on('disconnect', () => {
        console.log('Um usuário desconectou');
    });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
