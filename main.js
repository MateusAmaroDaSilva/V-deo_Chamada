const APP_ID = "d291ead6adcc4b4891447c361347f199";
const TOKEN = "007eJxTYDiyssjuyns+288vql//Cfc1/6UQfqxiTf/Jvis39B8y1K5VYEgxsjRMTUwxS0xJTjZJMrGwNDQxMU82NjM0NjFPM7S05Hr3IK0hkJGBXbSOmZEBAkF8Foac/NIUBgYALrUhgA==";
const CHANNEL = "loud";

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
const chatClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }); // Cliente para chat

let localTracks = [];
let remoteUsers = {};
let screenTrack = null;
let isJoined = false;
let userIdCounter = 1; // Contador global de IDs de usuários
let currentUser = ''; // Nome do usuário atual

// Função para iniciar e exibir o stream local
const joinAndDisplayLocalStream = async () => {
    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    try {
        const UID = await client.join(APP_ID, CHANNEL, TOKEN, null);
        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

        currentUser = `usuario0${userIdCounter}`; // Define o nome do usuário (usuario01, usuario02, etc.)
        userIdCounter++; // Incrementa o contador para o próximo usuário que entrar

        const player = `
            <div class="video-container" id="user-container-${UID}">
                <div class="video-player" id="user-${UID}"></div>
            </div>
        `;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
        localTracks[1].play(`user-${UID}`);
        await client.publish([localTracks[0], localTracks[1]]);
    } catch (error) {
        console.error('Erro ao iniciar o stream local: ', error);
    }
}

// Função para iniciar o stream e o chat
const joinStream = async () => {
    if (isJoined) return;
    isJoined = true;
    await joinAndDisplayLocalStream();

    // Configura o cliente de chat e a comunicação em tempo real
    chatClient.on('message-received', handleMessageReceived);
    await chatClient.join(APP_ID, CHANNEL, TOKEN, null); // Mesmo canal para chat

    document.getElementById('join-btn').style.display = 'none';
    document.getElementById('stream-wrapper').style.display = 'flex';
    document.getElementById('stream-controls-wrapper').style.display = 'flex';
    document.getElementById('chat-wrapper').style.display = 'flex'; // Exibe o chat
}

// Função para lidar com novos usuários
const handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player) {
            player.remove(); 
        }

        player = `
            <div class="video-container" id="user-container-${user.uid}">
                <div class="video-player" id="user-${user.uid}"></div>
            </div>
        `;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
        user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

// Função para lidar com usuários que saem
const handleUserLeft = async (user) => {
    delete remoteUsers[user.uid];
    document.getElementById(`user-container-${user.uid}`).remove();
}

// Função para sair e remover o stream local
const leaveAndRemoveLocalStream = async () => {
    if (!isJoined) return;
    isJoined = false;

    for (let i = 0; i < localTracks.length; i++) {
        localTracks[i].stop();
        localTracks[i].close();
    }

    await client.leave();
    await chatClient.leave(); // Deixa o canal de chat
    document.getElementById('join-btn').style.display = 'block';
    document.getElementById('stream-wrapper').style.display = 'none';
    document.getElementById('stream-controls-wrapper').style.display = 'none';
    document.getElementById('chat-wrapper').style.display = 'none'; // Oculta o chat
    document.getElementById('video-streams').innerHTML = '';
}

// Função para alternar o microfone
const toggleMic = async (e) => {
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

// Função para alternar a câmera
const toggleCamera = async (e) => {
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

// Função para alternar o compartilhamento de tela
const toggleScreenShare = async (e) => {
    if (!screenTrack) {
        try {
            screenTrack = await AgoraRTC.createScreenVideoTrack();
            const player = `
                <div class="video-container" id="user-container-screen">
                    <div class="video-player" id="user-screen"></div>
                </div>
            `;
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

// Função para enviar mensagens no chat com o nome do usuário
const sendMessage = async () => {
    const messageInput = document.getElementById('chat-input');
    const message = messageInput.value;
    if (message.trim() !== '') {
        const formattedMessage = `${currentUser}: ${message}`;
        const chatBox = document.getElementById('chat-box');
        chatBox.innerHTML += `<div>${formattedMessage}</div>`;
        messageInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll automático para a última mensagem

        // Envia a mensagem para todos os usuários
        chatClient.sendMessage({
            text: formattedMessage,
            toChannelId: CHANNEL
        });
    }
}

// Função para lidar com mensagens recebidas
const handleMessageReceived = (message) => {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML += `<div>${message.text}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll automático para a última mensagem
}

// Adiciona os eventos aos botões
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('join-btn').addEventListener('click', joinStream);
    document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
    document.getElementById('mic-btn').addEventListener('click', toggleMic);
    document.getElementById('camera-btn').addEventListener('click', toggleCamera);
    document.getElementById('share-screen-btn').addEventListener('click', toggleScreenShare);
    document.getElementById('send-message').addEventListener('click', sendMessage);
});
