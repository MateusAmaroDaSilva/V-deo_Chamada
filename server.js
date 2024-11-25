const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const upload = multer({ dest: 'audio/' }); // Diretório temporário para uploads

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint de transcrição
app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        // Verificar se há um arquivo enviado
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const audioPath = req.file.path;
        const newAudioPath = `audio/${req.file.filename}${path.extname(req.file.originalname)}`;

        // Renomear o arquivo para manter a extensão correta
        fs.rename(audioPath, newAudioPath, (err) => {
            if (err) {
                console.error(`Erro ao renomear arquivo: ${err}`);
                return res.status(500).json({ error: 'Erro ao processar o arquivo de áudio.' });
            }

            console.log(`Novo arquivo adicionado: ${newAudioPath}`);

            let transcriptionResult = '';

            // Chamar o script Python para transcrição
            const pythonProcess = spawn('python', ['transcricao.py', newAudioPath]);

            // Receber a transcrição do stdout do script Python
            pythonProcess.stdout.on('data', (data) => {
                const text = data.toString('utf-8');
                console.log(`Transcrição recebida: ${text}`);
                transcriptionResult += text;

                // Enviar transcrição parcial para os clientes conectados
                io.emit('transcription', text);
            });

            // Capturar erros do script Python
            pythonProcess.stderr.on('data', (data) => {
                console.error(`Erro no script Python: ${data}`);
            });

            // Finalizar o processamento do arquivo
            pythonProcess.on('close', (code) => {
                console.log(`Processo Python finalizado com código ${code}`);
                if (code === 0) {
                    // Salvar transcrição no arquivo
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

                // Remover o arquivo de áudio temporário
                fs.unlink(newAudioPath, (err) => {
                    if (err) console.error(`Erro ao deletar o arquivo: ${err}`);
                    else console.log(`Arquivo de áudio deletado: ${newAudioPath}`);
                });
            });
        });
    } catch (error) {
        console.error('Erro ao processar a transcrição:', error);
        res.status(500).json({ error: 'Erro ao processar a transcrição.' });
    }
});

// Configuração do Socket.IO
io.on('connection', (socket) => {
    console.log(`Novo cliente conectado: ${socket.id}`);

    // Receber mensagens do chat
    socket.on('chat message', (msg) => {
        console.log(`Mensagem recebida: ${msg}`);
        io.emit('chat message', msg); // Reenvia para todos os clientes conectados
    });

    // Tratamento de desconexão
    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// Inicializar o servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
