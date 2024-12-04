    const APP_ID = "d291ead6adcc4b4891447c361347f199";
    const TOKEN = "007eJxTYMi65P/o/+31a2cn905PmH/6+OW91dPbH/cFxYYwVm32/hGkwJBiZGmYmphilpiSnGySZGJhaWhiYp5sbGZobGKeZmhpuTcsIL0hkJEhU5qDhZEBAkF8VoayzJTUfAYGAG0UIa8=";
    const CHANNEL = "video";

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    let localTracks = [];
    let remoteUsers = {};
    let screenTrack = null;
    let isJoined = false;

    let mediaRecorder;
    let audioChunks = [];
    

    let lastTranscriptionTime = 0;
    const transcriptionInterval = 10000; 

    const socket = io('https://video-chamada-r6rl.onrender.com/'); 


    socket.on('user name', (name) => {
        currentUser = name;
        console.log(`Seu nome é ${currentUser}`);
    });

    let transcriptionContent = document.getElementById('transcription-content');

    function updateMeetingDate() {
        const dateElement = document.getElementById('meeting-date');
        
        if (dateElement) {
            const currentDate = new Date();
            const formattedDate = currentDate.toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            dateElement.textContent = `Reunião Talklog (${formattedDate})`;
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        updateMeetingDate();
    });

    function endMeeting() {
        stopTimer();
        console.log("Reunião finalizada. O tempo total foi: " + document.getElementById('timerDisplay').textContent);
    }

    let startTime = Date.now();
    let timerInterval;

    function updateTimer() {
        let elapsedTime = Date.now() - startTime; 
        let seconds = Math.floor(elapsedTime / 1000) % 60;
        let minutes = Math.floor(elapsedTime / 60000) % 60;
        let hours = Math.floor(elapsedTime / 3600000); 

        seconds = seconds < 10 ? '0' + seconds : seconds;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        hours = hours < 10 ? '0' + hours : hours;

        document.getElementById('meeting-timer').textContent = `${hours}:${minutes}:${seconds}`;
    }

    timerInterval = setInterval(updateTimer, 1000); 

    let joinAndDisplayLocalStream = async () => {
        console.log("Tentando iniciar o stream local...");
        client.on('user-published', handleUserJoined);
        client.on('user-left', handleUserLeft);

        try {
            const UID = await client.join(APP_ID, CHANNEL, TOKEN, null);
            localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

            const player = `<div class="video-container" id="user-container-${UID}">
                                <div class="video-player" id="user-${UID}"></div>
                        </div>`;
            document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
            localTracks[1].play(`user-${UID}`);
            await client.publish([localTracks[0], localTracks[1]]);

            monitorAudioActivity();

            await startTranscription();
        } catch (error) {
            console.error('Erro ao iniciar o stream local: ', error);
        }
    };
    

    let joinStream = async () => {
        if (isJoined) return;
        isJoined = true;
        await joinAndDisplayLocalStream();
        document.getElementById('join-btn').style.display = 'none';
        document.getElementById('stream-wrapper').style.display = 'flex';
        document.getElementById('stream-controls-wrapper').style.display = 'flex';
        document.getElementById('chat-wrapper').style.display = 'flex'; 
    };

    let handleUserJoined = async (user, mediaType) => {
        remoteUsers[user.uid] = user;
        await client.subscribe(user, mediaType);

        if (mediaType === 'video') {
            const player = document.getElementById(`user-container-${user.uid}`);
            if (player) {
                player.remove();
            }

            const newPlayer = `<div class="video-container" id="user-container-${user.uid}">
                                <div class="video-player" id="user-${user.uid}"></div>
                            </div>`;
            document.getElementById('video-streams').insertAdjacentHTML('beforeend', newPlayer);
            user.videoTrack.play(`user-${user.uid}`);
        }

        if (mediaType === 'audio') {
            user.audioTrack.play();
        }
    };

    let handleUserLeft = async (user) => {
        delete remoteUsers[user.uid];
    
        const player = document.getElementById(`user-container-${user.uid}`);
        if (player) {
            player.remove();
        }
    
        console.log(`Usuário ${user.uid} saiu. Outros ainda estão na chamada.`);
    };
    
    let leaveMeeting = async () => {
        for (let track of localTracks) {
            track.stop();
            track.close();
        }
    

        await client.leave();
    
        window.location.href = '/informacoes.html';
    };
     

    document.getElementById('leave-btn').addEventListener('click', leaveMeeting);    

    const audioActivity = {};

    async function monitorAudioActivity() {
        for (const uid in remoteUsers) {
            const user = remoteUsers[uid];
            if (user.audioTrack) {
                const volumeLevel = await user.audioTrack.getVolumeLevel();
                updateAudioBorder(uid, volumeLevel);
            }
        }

        if (localTracks[0]) {
            const volumeLevel = await localTracks[0].getVolumeLevel();
            updateAudioBorder("local", volumeLevel);
        }

        requestAnimationFrame(monitorAudioActivity);
    }

    function updateAudioBorder(uid, volumeLevel) {
        const container = uid === "local" ? 
            document.getElementById(`user-container-${client.uid}`) : 
            document.getElementById(`user-container-${uid}`);

        if (container) {
            if (volumeLevel > 0.1) {
                container.style.border = "3px solid green";
            } else {
                container.style.border = "none";
            }
        }
    }

    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let analyser = audioContext.createAnalyser();
    let microphone;
    let audioLevel = 0;
    let threshold = 0.03;  
    let minVoiceFrequency = 150;  
    let maxVoiceFrequency = 3000;  

    let isSpeaking = false;
    let stopSpeakingTimeout;

    async function setupAudio() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            analyser.fftSize = 256;  
            let bufferLength = analyser.frequencyBinCount;
            let dataArray = new Uint8Array(bufferLength);

            function checkAudioLevel() {
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                audioLevel = sum / bufferLength;  

                let voiceDetected = false;
                for (let i = 0; i < bufferLength; i++) {
                    let frequency = analyser.frequencyBinCount / bufferLength * i;
                    if (frequency >= minVoiceFrequency && frequency <= maxVoiceFrequency && dataArray[i] > threshold * 255) {
                        voiceDetected = true;
                        break;
                    }
                }

                const videoContainer = document.querySelector('.video-container'); 

                if (voiceDetected && !isSpeaking) {
                    isSpeaking = true;  
                    if (videoContainer && !videoContainer.style.border) {
                        videoContainer.style.border = '5px solid green'; 
                    }
                }

                if (!voiceDetected && isSpeaking) {
                    stopSpeakingTimeout = setTimeout(() => {
                        isSpeaking = false;  
                        if (videoContainer) {
                            videoContainer.style.border = '';  
                        }
                    }, 200);  
                }

                requestAnimationFrame(checkAudioLevel);
            }

            checkAudioLevel();  
        } catch (err) {
            console.log('Erro ao acessar o microfone:', err);
        }
    }
    
    setupAudio();

    let leaveAndRemoveLocalStream = async () => {
        if (!isJoined) return;
        isJoined = false;

        for (let track of localTracks) {
            track.stop();
            track.close();
        }

        await client.leave();
        document.getElementById('join-btn').style.display = 'block';
        document.getElementById('stream-wrapper').style.display = 'none';
        document.getElementById('stream-controls-wrapper').style.display = 'none';
        document.getElementById('chat-wrapper').style.display = 'none';
        document.getElementById('video-streams').innerHTML = '';

        function handleChatKey(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendMessage();
            }
        }
        
        function sendMessage() {
            const chatInput = document.getElementById('chat-input');
            const message = chatInput.value.trim();
            if (message) {
                socket.emit('chat message', message);
                chatInput.value = '';
            }
        }
        
        socket.on('chat message', (msg) => {
            const chatBox = document.getElementById('chat-box');
            const msgElement = document.createElement('p');
            msgElement.textContent = msg;
            chatBox.appendChild(msgElement);
            chatBox.scrollTop = chatBox.scrollHeight;
        });

        if (mediaRecorder) {
            mediaRecorder.stop();
        }
    };

    let toggleMic = async (e) => {
        const micButton = document.getElementById("mic-btn");

        if (localTracks[0].muted) {
            await localTracks[0].setMuted(false);
            micButton.innerHTML = '<ion-icon name="mic-outline"></ion-icon>'; 
            micButton.style.backgroundColor = '#EE4B2';
        } else {
            await localTracks[0].setMuted(true);
            micButton.innerHTML = '<ion-icon name="mic-off-outline"></ion-icon>'; 
            micButton.style.backgroundColor = '#EE4B2';
        }
    };

    let toggleCamera = async (e) => {
        const cameraButton = document.getElementById("camera-btn");

        if (localTracks[1].muted) {
            await localTracks[1].setMuted(false);
            cameraButton.innerHTML = '<ion-icon name="videocam-outline"></ion-icon>'; 
            cameraButton.style.backgroundColor = '#EE4B2';
        } else {
            await localTracks[1].setMuted(true);
            cameraButton.innerHTML = '<ion-icon name="videocam-off-outline"></ion-icon>'; 
            cameraButton.style.backgroundColor = '#EE4B2';
        }
    };

    let toggleScreenShare = async (e) => {
        if (!screenTrack) {
            try {
                screenTrack = await AgoraRTC.createScreenVideoTrack();
                const player = `<div class="video-container" id="user-container-screen">
                                    <div class="video-player" id="user-screen"></div>
                                </div>`;
                document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
                screenTrack.play('user-screen');
                await client.publish(screenTrack);
                e.target.innerText = 'Parar de Compartilhar';
                e.target.style.backgroundColor = '#EE4B2B';
            } catch (error) {
                console.error('Erro ao compartilhar a tela: ', error);
            }
        } else {
            try {
                await client.unpublish(screenTrack);
                screenTrack.close();
                document.getElementById('user-container-screen').remove();
                screenTrack = null;
                e.target.innerText = 'Compartilhar Tela';
                e.target.style.backgroundColor = '#EE4B2B';
            } catch (error) {
                console.error('Erro ao parar o compartilhamento de tela: ', error);
            }
        }
    };


    let sendMessage = async () => {
        const token = localStorage.getItem('token'); // Obtém o token do localStorage
    
        if (!token || token === null) {
            window.location.href = 'not_auth.html'; // Redireciona se não houver token
        } else {
            // Verifica a autenticação do token
            try {
                const response = await fetch('https://api-authetication-jwt.onrender.com/protected', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}` // Envia o token na requisição
                    }
                });
    
                if (!response.ok) {
                    throw new Error('Você não está autorizado a acessar esta página.');
                }
    
                // Se a autenticação for bem-sucedida, busca as informações do usuário
                const userData = await response.json();
                const name_user = userData.name;  // Nome de login do usuário
                const avatar_url = userData.avatar_url;  // URL do avatar
    
                // Obtém a mensagem digitada no chat
                const messageInput = document.getElementById('chat-input');
                const message = messageInput.value.trim();
    
                if (message !== '') {
                    // Formata a mensagem para incluir o avatar e o nome de login
                    const formattedMessage = `<img src="${avatar_url}" width="25px"> ${name_user}: ${message}`;
    
                    // Emite a mensagem para o servidor
                    socket.emit('chat message', formattedMessage);
    
                    // Limpa o campo de input
                    messageInput.value = '';
                }
            } catch (error) {
                console.error('Erro na requisição:', error.message);
            }
        }
    };
    

    socket.on('chat message', (msg) => {
        const chatBox = document.getElementById('chat-box');
        chatBox.innerHTML += `<p>${msg}</p>`;
        chatBox.scrollTop = chatBox.scrollHeight; 
    });

    async function startTranscription() {
        const currentTime = Date.now();
        if (currentTime - lastTranscriptionTime < transcriptionInterval) {
            console.warn('Tentando enviar requisições muito rápido, espere um pouco...');
            return;
        }

        lastTranscriptionTime = currentTime;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            
            const startRecording = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.ondataavailable = (event) => {
                        audioChunks.push(event.data); 
                    };
            
                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        sendAudioToServer(audioBlob);
                    };
            
                    mediaRecorder.start();
                    console.log("Gravação iniciada.");
            
                    setTimeout(() => {
                        mediaRecorder.stop();
                        console.log("Gravação parada.");
                    }, 5000);  
                } catch (error) {
                    console.error('Erro ao acessar o microfone:', error);
                }
            };
            
            const sendAudioToServer = async (audioBlob) => {
                const formData = new FormData();
                formData.append('audio', audioBlob, 'audio.wav');
            
                try {
                    const response = await fetch('(https://audionode.onrender.com/v1/uploadFile', {
                        method: 'POST',
                        body: formData,
                    });
            
                    if (response.ok) {
                        console.log('Áudio enviado com sucesso!');
                        alert("Áudio enviado com sucesso!");
                    } else {
                        console.error('Erro ao enviar o áudio:', response.status);
                    }
                } catch (error) {
                    console.error('Erro ao enviar o áudio:', error);
                }
            };

            mediaRecorder.start();
            console.log("Gravação de áudio iniciada.");
        } catch (error) {
            console.error('Erro ao iniciar a transcrição: ', error);
        }
    }

    function updateTranscription(text) {
        transcriptionContent.innerText += text + '\n'; 
    }

    async function fetchWithRetry(url, options, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) {
                    return response;
                }
                if (i === retries - 1) throw new Error('Max retries reached');
            } catch (error) {
                console.error('Erro na requisição: ', error);
                if (i === retries - 1) throw error;
            }
        }
    }

    document.getElementById('join-btn').addEventListener('click', joinStream);
    document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
    document.getElementById('mic-btn').addEventListener('click', toggleMic);
    document.getElementById('camera-btn').addEventListener('click', toggleCamera);
    document.getElementById('screen-btn').addEventListener('click', toggleScreenShare);
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

