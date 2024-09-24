const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'audio/' });

app.use(express.static('public')); // Serve arquivos estáticos da pasta 'public'

// Endpoint para transcrição de áudio
app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const audioPath = req.file.path;
        const newAudioPath = `audio/${req.file.filename}${path.extname(req.file.originalname)}`;

        // Renomeia o arquivo de áudio para garantir a extensão correta
        fs.rename(audioPath, newAudioPath, (err) => {
            if (err) {
                console.error(`Erro ao renomear arquivo: ${err}`);
                return res.status(500).json({ error: 'Erro ao processar o arquivo de áudio.' });
            }

            console.log(`Novo arquivo adicionado: ${newAudioPath}`);

            let transcriptionResult = '';

            // Chama o script Python para transcrição
            const pythonProcess = spawn('python', ['transcricao.py', newAudioPath]);

            pythonProcess.stdout.on('data', (data) => {
                console.log(`Transcrição: ${data.toString('utf-8')}`); // Garanta que a saída seja convertida para UTF-8
                transcriptionResult += data.toString('utf-8'); // Armazena os dados recebidos em UTF-8
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Erro: ${data}`);
                // Não envie a resposta aqui para evitar múltiplos envios
            });

            pythonProcess.on('close', (code) => {
                console.log(`Processo finalizado com código ${code}`);
                if (code === 0) {
                    // Salvar a transcrição em UTF-8
                    fs.writeFile('transcricao.txt', transcriptionResult, { encoding: 'utf-8' }, (err) => {
                        if (err) {
                            console.error('Erro ao salvar a transcrição:', err);
                            return res.status(500).json({ error: 'Erro ao salvar a transcrição' });
                        }
                        res.json({ text: transcriptionResult }); // Envia a transcrição como resposta apenas uma vez
                    });
                } else {
                    res.status(500).json({ error: 'Erro na transcrição.' });
                }

                // Apaga o arquivo após a transcrição
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

// Roda o servidor na porta 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
