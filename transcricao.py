import sys
import whisper
from pathlib import Path

if len(sys.argv) != 2:
    print("Uso: python transcricao.py <caminho_do_audio>")
    sys.exit(1)

audio_path = sys.argv[1]

model = whisper.load_model("small")
result = model.transcribe(audio_path)

with open(audio_path + '.txt', 'w', encoding='utf-8') as arquivo:
    arquivo.write(result['text'])

print("Transcrição concluída e salva em", audio_path + '.txt')
