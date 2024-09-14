const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuração de CORS para permitir requisições da URL do front-end
app.use(cors({
    origin: 'https://video-chamada.vercel.app' // Substitua pela URL do seu front-end
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log('Um usuário conectou');

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg); // Envia a mensagem para todos os usuários conectados
    });

    socket.on('disconnect', () => {
        console.log('Um usuário desconectou');
    });
});

const PORT = process.env.PORT || 3000; // Usar a porta definida pelas variáveis de ambiente
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
