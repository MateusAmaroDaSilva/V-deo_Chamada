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

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));    

// Configuração do Multer para salvar arquivos temporariamente na pasta "audio/"
const upload = multer({ dest: 'audio/' });

let meetings = [];

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reuniao.html'));
});

app.post('/create-meeting', (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nome da reunião é obrigatório' });
    }

    const meetingId = Date.now().toString(); 
    const meeting = { id: meetingId, name, participants: [] };
    meetings.push(meeting);

    console.log('Reuniões ativas:', meetings); 

    io.emit('new-meeting', meeting);
    res.json({ success: true, meeting });
});

app.get('/meetings', (req, res) => {
    console.log('Enviando reuniões:', meetings);
    res.json(meetings); 
});

app.post('/join-meeting/:id', (req, res) => {
    const { id } = req.params;
    const meeting = meetings.find((m) => m.id === id);

    if (meeting) {
        res.json({ success: true, meetingId: id });
    } else {
        res.status(404).json({ error: 'Reunião não encontrada' });
    }
});

// Nova rota para salvar áudio na pasta "audio"
app.post('/save-audio', upload.single('audio'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const tempPath = req.file.path; // Caminho temporário gerado pelo multer
        const finalPath = `audio/${req.file.originalname}`; // Nome final na pasta "audio"

        fs.rename(tempPath, finalPath, (err) => {
            if (err) {
                console.error(`Erro ao mover o arquivo: ${err}`);
                return res.status(500).json({ error: 'Erro ao salvar o arquivo de áudio.' });
            }

            console.log(`Áudio salvo com sucesso em: ${finalPath}`);
            res.json({ success: true, message: 'Áudio salvo com sucesso!', path: finalPath });
        });
    } catch (error) {
        console.error('Erro ao processar o arquivo de áudio:', error);
        res.status(500).json({ error: 'Erro ao processar o arquivo.' });
    }
});

io.on('connection', (socket) => {
    console.log(`Novo cliente conectado: ${socket.id}`);

    socket.on('join-meeting', (meetingId) => {
        socket.join(meetingId); 
        io.to(meetingId).emit('user-joined', socket.id); 
    });

    socket.on('start-timer', (meetingId, startTime) => {
        io.to(meetingId).emit('update-timer', startTime); 
    });

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
