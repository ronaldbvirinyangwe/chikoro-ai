# ============================================
# TTS MICROSERVICE FOR CHIKORO AI
# Save this as: tts_service.py
# ============================================

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
import base64
import io
import os
import tempfile
import json
from datetime import datetime

# Import TTS
try:
    from TTS.api import TTS
    COQUI_AVAILABLE = True
except ImportError:
    COQUI_AVAILABLE = False
    print("Warning: Coqui TTS not available. Install with: pip install TTS")

# Fallback to pyttsx3
try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False
    print("Warning: pyttsx3 not available. Install with: pip install pyttsx3")

app = Flask(__name__)
CORS(app)  # Enable CORS for your Express backend

# Global TTS instance
tts_engine = None
voice_engine = None

def initialize_tts():
    """Initialize TTS engine based on availability"""
    global tts_engine, voice_engine
    
    if COQUI_AVAILABLE:
        try:
            # Try to use GPU if available
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Initializing Coqui TTS on {device}...")
            
            # Start with a fast, lightweight model
            # Options:
            # - tts_models/en/ljspeech/glow-tts (fast, good quality)
            # - tts_models/en/ljspeech/tacotron2-DDC (better quality, slower)
            # - tts_models/multilingual/multi-dataset/xtts_v2 (best, supports voice cloning)
            
            tts_engine = TTS("tts_models/en/ljspeech/glow-tts").to(device)
            print("Coqui TTS initialized successfully!")
            return True
        except Exception as e:
            print(f"Failed to initialize Coqui TTS: {e}")
            tts_engine = None
    
    if PYTTSX3_AVAILABLE and not tts_engine:
        try:
            print("Falling back to pyttsx3...")
            voice_engine = pyttsx3.init()
            voice_engine.setProperty('rate', 150)  # Speed
            voice_engine.setProperty('volume', 0.9)  # Volume
            
            # Try to use a better voice if available
            voices = voice_engine.getProperty('voices')
            for voice in voices:
                if 'english' in voice.name.lower():
                    voice_engine.setProperty('voice', voice.id)
                    break
                    
            print("pyttsx3 initialized successfully!")
            return True
        except Exception as e:
            print(f"Failed to initialize pyttsx3: {e}")
            voice_engine = None
    
    return False

# Initialize on startup
initialize_tts()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'coqui_available': COQUI_AVAILABLE and tts_engine is not None,
        'pyttsx3_available': PYTTSX3_AVAILABLE and voice_engine is not None,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/synthesize', methods=['POST'])
def synthesize():
    """Basic text-to-speech synthesis"""
    try:
        data = request.json
        text = data.get('text', '')
        voice_id = data.get('voice_id', 'default')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Use Coqui if available
        if tts_engine:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                # Generate speech
                tts_engine.tts_to_file(
                    text=text,
                    file_path=tmp_file.name,
                    speaker=voice_id if voice_id != 'default' else None
                )
                
                # Read and encode
                with open(tmp_file.name, 'rb') as f:
                    audio_data = f.read()
                
                # Clean up
                os.unlink(tmp_file.name)
                
                return jsonify({
                    'audio': base64.b64encode(audio_data).decode('utf-8'),
                    'format': 'wav',
                    'engine': 'coqui'
                })
        
        # Fallback to pyttsx3
        elif voice_engine:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                voice_engine.save_to_file(text, tmp_file.name)
                voice_engine.runAndWait()
                
                with open(tmp_file.name, 'rb') as f:
                    audio_data = f.read()
                
                os.unlink(tmp_file.name)
                
                return jsonify({
                    'audio': base64.b64encode(audio_data).decode('utf-8'),
                    'format': 'wav',
                    'engine': 'pyttsx3'
                })
        
        else:
            return jsonify({'error': 'No TTS engine available'}), 500
            
    except Exception as e:
        print(f"Synthesis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/synthesize-streaming', methods=['POST'])
def synthesize_streaming():
    """Streaming synthesis for real-time applications"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text or not tts_engine:
            return jsonify({'error': 'Streaming not available'}), 400
        
        # Split text into sentences for streaming
        sentences = text.replace('!', '.').replace('?', '.').split('.')
        sentences = [s.strip() for s in sentences if s.strip()]
        
        audio_chunks = []
        
        for sentence in sentences:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                tts_engine.tts_to_file(text=sentence, file_path=tmp_file.name)
                
                with open(tmp_file.name, 'rb') as f:
                    chunk_data = base64.b64encode(f.read()).decode('utf-8')
                    audio_chunks.append(chunk_data)
                
                os.unlink(tmp_file.name)
        
        return jsonify({
            'chunks': audio_chunks,
            'format': 'wav',
            'engine': 'coqui'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/clone-voice', methods=['POST'])
def clone_voice():
    """Voice cloning endpoint (requires XTTS model)"""
    try:
        if not COQUI_AVAILABLE:
            return jsonify({'error': 'Voice cloning not available'}), 400
        
        # For voice cloning, we need XTTS
        global tts_engine
        if not tts_engine or 'xtts' not in str(type(tts_engine)).lower():
            device = "cuda" if torch.cuda.is_available() else "cpu"
            tts_engine = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
        
        data = request.json
        text = data.get('text', '')
        speaker_wav_base64 = data.get('speaker_wav', '')
        language = data.get('language', 'en')
        
        if not text or not speaker_wav_base64:
            return jsonify({'error': 'Text and speaker_wav required'}), 400
        
        # Decode speaker audio
        speaker_wav = base64.b64decode(speaker_wav_base64)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as speaker_file:
            speaker_file.write(speaker_wav)
            speaker_file.flush()
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as output_file:
                # Generate with cloned voice
                tts_engine.tts_to_file(
                    text=text,
                    speaker_wav=speaker_file.name,
                    language=language,
                    file_path=output_file.name
                )
                
                with open(output_file.name, 'rb') as f:
                    audio_data = f.read()
                
                # Clean up
                os.unlink(speaker_file.name)
                os.unlink(output_file.name)
                
                return jsonify({
                    'audio': base64.b64encode(audio_data).decode('utf-8'),
                    'format': 'wav',
                    'engine': 'xtts'
                })
                
    except Exception as e:
        print(f"Voice cloning error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/list-voices', methods=['GET'])
def list_voices():
    """List available voices"""
    voices = []
    
    if tts_engine and hasattr(tts_engine, 'speakers'):
        voices.extend([{
            'id': speaker,
            'name': speaker,
            'engine': 'coqui'
        } for speaker in tts_engine.speakers])
    
    if voice_engine:
        pyttsx_voices = voice_engine.getProperty('voices')
        voices.extend([{
            'id': voice.id,
            'name': voice.name,
            'engine': 'pyttsx3'
        } for voice in pyttsx_voices])
    
    return jsonify({'voices': voices})

@app.route('/models', methods=['GET'])
def list_models():
    """List available TTS models"""
    models = []
    
    if COQUI_AVAILABLE:
        # List some recommended models
        models = [
            {
                'id': 'tts_models/en/ljspeech/glow-tts',
                'name': 'LJSpeech Glow-TTS (Fast)',
                'languages': ['en'],
                'features': ['fast', 'lightweight']
            },
            {
                'id': 'tts_models/en/ljspeech/tacotron2-DDC',
                'name': 'LJSpeech Tacotron2',
                'languages': ['en'],
                'features': ['high-quality']
            },
            {
                'id': 'tts_models/multilingual/multi-dataset/xtts_v2',
                'name': 'XTTS v2 (Voice Cloning)',
                'languages': ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'ar', 'zh-cn', 'ja'],
                'features': ['voice-cloning', 'multilingual', 'high-quality']
            },
            {
                'id': 'tts_models/en/vctk/vits',
                'name': 'VCTK VITS (Multi-speaker)',
                'languages': ['en'],
                'features': ['multi-speaker', 'high-quality']
            }
        ]
    
    return jsonify({'models': models})

if __name__ == '__main__':
    port = int(os.environ.get('TTS_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)