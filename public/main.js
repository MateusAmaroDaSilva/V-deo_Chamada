const APP_ID = "d291ead6adcc4b4891447c361347f199";
const TOKEN = "007eJxTYFD/YXfkvvL6ue+uRt/b+25p4XSfk0s8/CzmtsWJtF2rmmCowJBiZGmYmphilpiSnGySZGJhaWhiYp5sbGZobGKeZmhpyb3mbVpDICNDsL89AyMUgvgsDDn5pSkMDADvECCc";
const CHANNEL = "loud";

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = [];
let remoteUsers = {};
let screenTrack = null;
let isJoined = false;
let currentUser = '';
let mediaRecorder;
let audioChunks = [];

const socket = io('https://video-chamada-r6rl.onrender.com');

socket.on('user name', (name) => {
    currentUser = name;
    console.log(`Seu nome é ${currentUser}`);
});

let joinAndDisplayLocalStream = async () => {
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
    } catch (error) {
        console.error('Erro ao iniciar o stream local: ', error);
    }
}

let joinStream = async () => {
    if (isJoined) return; 
    isJoined = true;
    await joinAndDisplayLocalStream();
    document.getElementById('join-btn').style.display = 'none';
    document.getElementById('stream-wrapper').style.display = 'flex';
    document.getElementById('stream-controls-wrapper').style.display = 'flex';
    document.getElementById('chat-wrapper').style.display = 'flex'; 

    // Iniciar a transcrição
    await startTranscription();
}

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player) {
            player.remove();
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                      <div class="video-player" id="user-${user.uid}"></div>
                 </div>`;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

        user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid];
    document.getElementById(`user-container-${user.uid}`).remove();

    // Verifica se não há mais usuários na chamada
    if (Object.keys(remoteUsers).length === 0) {
        // Redireciona para a página de resumo
        document.getElementById('stream-wrapper').style.display = 'none';
        document.getElementById('chat-wrapper').style.display = 'none';
        document.getElementById('summary-wrapper').style.display = 'flex';

        // Carrega o resumo da reunião
        loadSummary();
    }
}

let leaveAndRemoveLocalStream = async () => {
    if (!isJoined) return; 
    isJoined = false;

    for (let i = 0; i < localTracks.length; i++) {
        localTracks[i].stop();
        localTracks[i].close();
    }

    await client.leave();
    document.getElementById('join-btn').style.display = 'block';
    document.getElementById('stream-wrapper').style.display = 'none';
    document.getElementById('stream-controls-wrapper').style.display = 'none';
    document.getElementById('chat-wrapper').style.display = 'none'; 
    document.getElementById('video-streams').innerHTML = '';

    // Parar a transcrição se estiver ativa
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
}

let toggleMic = async (e) => {
    if (localTracks[0].muted) {
        await localTracks[0].setMuted(false);
        e.target.innerText = 'Mic On';
        e.target.style.backgroundColor = 'cadetblue';
    } else {
        await localTracks[0].setMuted(true);
        e.target.innerText = 'Mic Off';
        e.target.style.backgroundColor = '#EE4B2B';
    }
}

let toggleCamera = async (e) => {
    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false);
        e.target.innerText = 'Camera On';
        e.target.style.backgroundColor = 'cadetblue';
    } else {
        await localTracks[1].setMuted(true);
        e.target.innerText = 'Camera Off';
        e.target.style.backgroundColor = '#EE4B2B';
    }
}

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
            e.target.style.backgroundColor = 'cadetblue';
        } catch (error) {
            console.error('Erro ao parar o compartilhamento de tela: ', error);
        }
    }
}

let sendMessage = async () => {
    const messageInput = document.getElementById('chat-input');
    const message = messageInput.value;
    if (message.trim() !== '') {
        const userName = currentUser || 'Anônimo';
        const formattedMessage = `${userName}: ${message}`;
        socket.emit('chat message', formattedMessage); 
        messageInput.value = ''; 
    }
}

socket.on('chat message', (msg) => {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML += `<p>${msg}</p>`;
});

// Função para capturar e transcrever áudio
async function startTranscription() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioStreamURL = URL.createObjectURL(audioBlob);

            try {
                const response = await fetch('/transcribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ audioStreamURL: audioStreamURL }),
                });
                const data = await response.json();
                console.log('Transcrição recebida:', data.text);
                // Aqui você pode exibir a transcrição em outra tela
            } catch (error) {
                console.error('Erro ao enviar o áudio:', error);
            }
        };

        mediaRecorder.start();
    } catch (error) {
        console.error('Erro ao acessar o microfone:', error);
    }
}

document.getElementById('join-btn').addEventListener('click', joinStream);
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('share-screen-btn').addEventListener('click', toggleScreenShare);
document.getElementById('send-message').addEventListener('click', sendMessage);

// Função para carregar o resumo
const loadSummary = async () => {
    try {
        const response = await fetch('/api/summary');
        if (response.ok) {
            const summary = await response.text();
            document.getElementById('summary-content').innerHTML = `<p>${summary}</p>`;
        } else {
            document.getElementById('summary-content').innerHTML = '<p>Erro ao carregar o resumo.</p>';
        }
    } catch (error) {
        console.error('Erro ao buscar o resumo:', error);
        document.getElementById('summary-content').innerHTML = '<p>Erro ao carregar o resumo.</p>';
    }
}

// Botão para voltar para a reunião (se necessário)
document.getElementById('back-to-meeting').addEventListener('click', () => {
    document.getElementById('summary-wrapper').style.display = 'none';
    document.getElementById('stream-wrapper').style.display = 'flex';
    document.getElementById('chat-wrapper').style.display = 'flex';
});
