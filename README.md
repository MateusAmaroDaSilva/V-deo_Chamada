# Sistema de Videochamada – Formato de Desenvolvimento  

O sistema de videochamada é uma solução moderna e eficiente, projetada para proporcionar comunicação audiovisual de alta qualidade e funcionalidades de suporte em tempo real. Ele combina tecnologias de ponta para garantir uma experiência fluida e intuitiva, atendendo às necessidades de usuários corporativos, educacionais e pessoais.  

---

## Como Funciona o Sistema  

### 1. Comunicação em Tempo Real  
- O sistema utiliza tecnologias como WebRTC e Socket.IO para permitir a transmissão de áudio, vídeo e mensagens entre os usuários.  
- As conexões são feitas de forma peer-to-peer, garantindo baixa latência e alta qualidade de comunicação.  

### 2. Detecção de Fala e Destaque Visual  
- Um algoritmo monitora continuamente o nível de áudio de cada participante para identificar quem está falando.  
- Quando um usuário fala, a borda da câmera dele é destacada em verde, indicando atividade de voz.  

### 3. Estrutura de Telas  

| Tela                          | Descrição                                                                 | Funcionalidades                                                                                  | Status              |
|-------------------------------|---------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|---------------------|
| **Tela Inicial (`reuniao.html`)**   | Exibe uma lista de reuniões disponíveis e permite que o usuário entre em uma reunião ou crie uma nova.  | - Listar reuniões. <br> - Botão para criar ou ingressar.                                         | Em desenvolvimento |
| **Tela da Reunião (`index.html`)**  | Ambiente principal da videochamada com vídeo, áudio e chat ao vivo.                                | - Transmissão de vídeo/áudio. <br> - Chat em tempo real. <br> - Detecção de fala com borda verde. | Implementada        |
| **Tela de Informações (`informacoes.html`)** | Apresenta os detalhes da reunião, como tempo de duração, horário de entrada e saída.               | - Duração da reunião. <br> - Cronômetro individual. <br> - Registro do horário de saída.         | Implementada        |

---

## Funcionalidades Detalhadas  

### 1. Funcionalidades de Videochamada  
- Suporte para múltiplos participantes com transmissão de áudio e vídeo.  
- Sincronização em tempo real de eventos como entrada/saída de usuários.  
- Detecção de voz para destacar o participante ativo (borda verde).  

### 2. Funcionalidades de Chat  
- Envio e recebimento de mensagens em tempo real.  
- Exibição integrada na tela da reunião para maior interação.  

### 3. Registro de Dados da Reunião  
- Monitoramento do tempo total que o usuário ficou conectado.  
- Registro do horário de entrada e saída no formato **hh:mm:ss**.  
- Armazenamento das informações para consultas futuras.  

---

## Tecnologias Utilizadas  

| Componente                   | Tecnologia Utilizada                                                         |
|------------------------------|------------------------------------------------------------------------------|
| **Comunicação em Tempo Real** | WebRTC – Para transmissão de áudio e vídeo ponto a ponto.                   |
| **Mensagens em Tempo Real**  | Socket.IO – Para sincronização de mensagens e eventos.                      |
| **Acesso à Câmera e Microfone** | MediaDevices API – Para acesso aos dispositivos do usuário diretamente no navegador. |
| **Interface de Usuário**     | React.js ou HTML5/CSS/JavaScript, combinado com Bootstrap para estilização. |
| **Backend**                  | Node.js com Express.js para gerenciar APIs e conexões do sistema.           |
| **Detecção de Fala**         | Speech Recognition API – Para identificar o participante ativo com base em níveis de áudio. |
| **Gerenciamento de Conexões** | Simple-Peer – Para facilitar o gerenciamento das conexões peer-to-peer no WebRTC. |
| **Banco de Dados (opcional)** | MongoDB ou Firebase – Para armazenar dados de reuniões, participantes e histórico de chats. |

---

## Fluxo de Funcionamento  

1. **Tela Inicial:**  
   - O usuário acessa a tela inicial e visualiza as reuniões em andamento.  
   - Pode optar por criar uma nova reunião ou ingressar em uma reunião existente.  

2. **Tela da Reunião:**  
   - Após ingressar, o usuário é conectado à sala via WebRTC.  
   - O sistema inicia a transmissão de vídeo e áudio.  
   - O chat ao vivo é ativado para comunicação textual.  
   - O destaque da câmera do participante ativo é gerenciado em tempo real.  

3. **Tela de Informações:**  
   - Ao sair da reunião, o usuário é redirecionado para a tela de informações.  
   - Detalhes como duração da reunião e horário de saída são exibidos.  

---

## Diferenciais do Sistema  

1. **Alta Performance:**  
   - Utilização de WebRTC para conexões diretas, minimizando atrasos e otimizando a qualidade.  

2. **Detecção de Fala:**  
   - O sistema destaca automaticamente quem está falando, melhorando a interação e a organização durante reuniões.  

3. **Registro Completo:**  
   - Informações detalhadas sobre o tempo de participação e dados da reunião são armazenadas para análises futuras.  

4. **Flexibilidade:**  
   - Interface amigável com suporte para diferentes dispositivos e navegadores.  

5. **Integração Fácil:**  
   - O backend modular permite integração com sistemas externos, como plataformas de aprendizado ou gestão empresarial.  

---

## Aplicações  

Ideal para empresas, instituições de ensino e qualquer grupo que necessite de comunicação remota confiável e de qualidade.  

Se quiser ver o resultado: https://video-chamada-r6rl.onrender.com/
