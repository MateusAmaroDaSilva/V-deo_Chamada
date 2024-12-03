const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
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

app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const audioPath = req.file.path;
        const newAudioPath = `audio/${req.file.filename}${path.extname(req.file.originalname)}`;

        fs.rename(audioPath, newAudioPath, (err) => {
            if (err) {
                console.error(`Erro ao renomear arquivo: ${err}`);
                return res.status(500).json({ error: 'Erro ao processar o arquivo de áudio.' });
            }

            let transcriptionResult = '';

            const pythonProcess = spawn('python', ['transcricao.py', newAudioPath]);

            pythonProcess.stdout.on('data', (data) => {
                const text = data.toString('utf-8');
                transcriptionResult += text;

                io.emit('transcription', text);
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Erro no script Python: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    fs.writeFile('transcricao.txt', transcriptionResult, 'utf-8', (err) => {
                        if (err) {
                            console.error('Erro ao salvar a transcrição:', err);
                            return res.status(500).json({ error: 'Erro ao salvar a transcrição' });
                        }
                        res.json({ text: transcriptionResult });
                    });
                } else {
                    res.status(500).json({ error: 'Erro na transcrição.' });
                }

                fs.unlink(newAudioPath, (err) => {
                    if (err) console.error(`Erro ao deletar o arquivo: ${err}`);
                });
            });
        });
    } catch (error) {
        console.error('Erro ao processar a transcrição:', error);
        res.status(500).json({ error: 'Erro ao processar a transcrição.' });
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
