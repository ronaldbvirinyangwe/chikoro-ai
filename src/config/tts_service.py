from flask import Flask, request, jsonify, send_file
from TTS.api import TTS
import torch  # <-- ADDED THIS LINE
import base64
import io
import os
import tempfile

app = Flask(__name__)

# Check if CUDA is available and set the device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Initialize TTS with a good model and move it to the selected device
# Options: tts_models/en/ljspeech/glow-tts (fast)
#          tts_models/multilingual/multi-dataset/xtts_v2 (best quality, supports voice cloning)
try:
    # Note: If you are using the XTTS model, you might need to install additional dependencies
    # pip install pydub
    tts = TTS("tts_models/en/ljspeech/glow-tts").to(device)
except Exception as e:
    print(f"Error initializing TTS: {e}")
    # Fallback to a CPU-only model or handle the error as needed
    tts = None


@app.route('/synthesize', methods=['POST'])
def synthesize():
    if not tts:
        return jsonify({'error': 'TTS model is not available.'}), 503

    try:
        data = request.json
        text = data.get('text', '')
        if not text:
            return jsonify({'error': 'No text provided.'}), 400

        # Generate speech
        # tts.tts_to_file returns the path to the file
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix='.wav').name
        tts.tts_to_file(text=text, file_path=output_path)
        
        # Read the file and convert to base64
        with open(output_path, 'rb') as f:
            audio_data = f.read()
        
        # Clean up the temporary file
        os.unlink(output_path)
        
        return jsonify({
            'audio': base64.b64encode(audio_data).decode('utf-8'),
            'format': 'wav'
        })
            
    except Exception as e:
        print(f"Error during synthesis: {e}")
        return jsonify({'error': str(e)}), 500

# This endpoint is specific to the XTTS model. 
# You would need to load "tts_models/multilingual/multi-dataset/xtts_v2" for this to work.
@app.route('/synthesize-with-voice', methods=['POST'])
def synthesize_with_voice():
    """For voice cloning with XTTS v2"""
    if not tts or "xtts" not in tts.model_name:
        return jsonify({'error': 'Voice cloning model (XTTS) is not loaded.'}), 503

    try:
        data = request.json
        text = data.get('text', '')
        speaker_wav_base64 = data.get('speaker_wav', '')

        if not text or not speaker_wav_base64:
            return jsonify({'error': 'Text and speaker_wav are required.'}), 400
        
        # Decode speaker wav
        speaker_wav_data = base64.b64decode(speaker_wav_base64)
        
        # Create temporary files for speaker and output
        speaker_file_path = tempfile.NamedTemporaryFile(delete=False, suffix='.wav').name
        output_file_path = tempfile.NamedTemporaryFile(delete=False, suffix='.wav').name

        try:
            with open(speaker_file_path, 'wb') as speaker_file:
                speaker_file.write(speaker_wav_data)
            
            tts.tts_to_file(
                text=text,
                speaker_wav=speaker_file_path,
                language="en",  # Adjust language if needed
                file_path=output_file_path
            )
            
            with open(output_file_path, 'rb') as f:
                audio_data = f.read()

            return jsonify({
                'audio': base64.b64encode(audio_data).decode('utf-8'),
                'format': 'wav'
            })
        finally:
            # Clean up temporary files
            if os.path.exists(speaker_file_path):
                os.unlink(speaker_file_path)
            if os.path.exists(output_file_path):
                os.unlink(output_file_path)
                
    except Exception as e:
        print(f"Error during voice cloning: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)