const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Configurações de middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Verifica ou cria a pasta de áudio
const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
}

// Configuração do multer para salvar arquivos de áudio
const upload = multer({ dest: 'audio/' });

// Variável para armazenar as reuniões
let meetings = [];

// Middleware de CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Rotas principais

// Página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reuniao.html'));
});

// Criar reunião
app.post('/create-meeting', (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nome da reunião é obrigatório.' });
    }

    const meetingId = Date.now().toString(); // Gera um ID único com base no timestamp
    const meeting = { id: meetingId, name, participants: [] };
    meetings.push(meeting);

    io.emit('new-meeting', meeting); // Notifica todos os clientes sobre a nova reunião
    res.json({ success: true, meeting });
});

// Listar reuniões
app.get('/meetings', (req, res) => {
    res.json(meetings);
});

// Entrar em uma reunião
app.post('/join-meeting/:id', (req, res) => {
    const { id } = req.params;
    const meeting = meetings.find((m) => m.id === id);

    if (meeting) {
        res.json({ success: true, meetingId: id });
    } else {
        res.status(404).json({ error: 'Reunião não encontrada.' });
    }
});

// Salvar áudio
app.post('/save-audio', upload.single('audio'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const tempPath = req.file.path;
        const finalPath = path.join(audioDir, req.file.originalname);

        fs.rename(tempPath, finalPath, (err) => {
            if (err) {
                console.error(`Erro ao mover o arquivo: ${err}`);
                return res.status(500).json({ error: 'Erro ao salvar o arquivo de áudio.' });
            }

            console.log(`Áudio salvo com sucesso: ${finalPath}`);
            res.json({ success: true, message: 'Áudio salvo com sucesso!', path: finalPath });
        });
    } catch (error) {
        console.error('Erro ao processar o arquivo de áudio:', error);
        res.status(500).json({ error: 'Erro ao processar o arquivo.' });
    }
});

// Eventos do Socket.IO
io.on('connection', (socket) => {
    console.log(`Novo cliente conectado: ${socket.id}`);

    // Entrar em uma reunião
    socket.on('join-meeting', (meetingId) => {
        socket.join(meetingId);
        io.to(meetingId).emit('user-joined', socket.id);
    });

    // Temporizador sincronizado
    socket.on('start-timer', (meetingId, startTime) => {
        io.to(meetingId).emit('update-timer', startTime);
    });

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
});

// Inicialização do servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
