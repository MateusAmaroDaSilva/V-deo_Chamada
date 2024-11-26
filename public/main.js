const APP_ID = "d291ead6adcc4b4891447c361347f199";
const TOKEN = "007eJxTYChIadzhf1D2u0109Ur9H2K7F64oNI7Prdi5PGaa/p6q8rcKDClGloapiSlmiSnJySZJJhaWhiYm5snGZobGJuZphpaWExnd0hsCGRn+MqsyMTJAIIjPylCWmZKaz8AAAHpCHzU=";
const CHANNEL = "video";

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = [];
let remoteUsers = {};
let screenTrack = null;
let isJoined = false;
let currentUser = '';
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

    if (Object.keys(remoteUsers).length === 0) {
        
        document.getElementById('stream-wrapper').style.display = 'none';
        document.getElementById('chat-wrapper').style.display = 'none';
        document.getElementById('summary-wrapper').style.display = 'flex';

        loadSummary();
    }
};

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
        micButton.style.backgroundColor = '#333';
    } else {
        await localTracks[0].setMuted(true);
        micButton.innerHTML = '<ion-icon name="mic-off-outline"></ion-icon>'; 
        micButton.style.backgroundColor = '#333';
    }
};

let toggleCamera = async (e) => {
    const cameraButton = document.getElementById("camera-btn");

    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false);
        cameraButton.innerHTML = '<ion-icon name="videocam-outline"></ion-icon>'; 
        cameraButton.style.backgroundColor = '#333';
    } else {
        await localTracks[1].setMuted(true);
        cameraButton.innerHTML = '<ion-icon name="videocam-off-outline"></ion-icon>'; 
        cameraButton.style.backgroundColor = '#333';
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
            e.target.style.backgroundColor = 'cadetblue';
        } catch (error) {
            console.error('Erro ao parar o compartilhamento de tela: ', error);
        }
    }
};

let sendMessage = async () => {
    const messageInput = document.getElementById('chat-input');
    const message = messageInput.value.trim();
    if (message !== '') {
        const userName = currentUser || 'Anônimo';
        const formattedMessage = `${userName}: ${message}`;
        socket.emit('chat message', formattedMessage);
        messageInput.value = '';
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

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.mp3');

            try {
                const response = await fetchWithRetry('http://localhost:3000/transcribe', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const transcription = await response.json();
                    updateTranscription(transcription.text);
                } else if (response.status === 429) {
                    console.error('Erro: Muitas requisições enviadas.');
                    alert('Você está enviando muitas requisições. Tente novamente mais tarde.');
                } else {
                    console.error('Erro ao transcrever o áudio: ', response.status);
                }
            } catch (error) {
                console.error('Erro ao processar a transcrição: ', error);
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

async function loadSummary() {
    const summaryContent = document.getElementById('summary-content');
    summaryContent.innerHTML = '<p>Resumo da reunião: ...</p>';
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

