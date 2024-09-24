import sys
import whisper
from pathlib import Path

# Verifica se o caminho do arquivo foi passado como argumento
if len(sys.argv) != 2:
    print("Uso: python transcricao.py <caminho_do_audio>")
    sys.exit(1)

audio_path = sys.argv[1]

# Carrega o modelo Whisper
model = whisper.load_model("small")
result = model.transcribe(audio_path)

# Escreve a transcrição em um arquivo .txt com codificação UTF-8
with open(audio_path + '.txt', 'w', encoding='utf-8') as arquivo:
    arquivo.write(result['text'])

print("Transcrição concluída e salva em", audio_path + '.txt')
