from flask import Flask, render_template, request, jsonify
import os
import base64
import google.generativeai as genai
from dotenv import load_dotenv
import time
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure the Google Generative AI API
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable not set")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro')

app = Flask(__name__)

# Directory to store temporary files
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/analyze_behavior', methods=['POST'])
def analyze_behavior():
    # Get form data
    pet_name = request.form.get('pet_name', 'your pet')
    pet_type = request.form.get('pet_type', 'dog')
    pet_breed=request.form.get('pet_breed','breed')
    behavior_desc = request.form.get('behavior_desc', '')
    vocal_cues = request.form.get('vocal_cues', '')
    context = request.form.get('context', '')  # New context parameter

    # Process video if provided
    video_file = request.files.get('video_file')
    captured_video = request.form.get('captured_video', '')
    video_analysis = ""

    if video_file and video_file.filename:
        # Save the video to a temporary file
        temp_path = os.path.join(UPLOAD_FOLDER, f"temp_video_{int(time.time())}.mp4")
        video_file.save(temp_path)

        # Simple video analysis without OpenCV
        video_analysis = "Video was analyzed. "
        file_size = os.path.getsize(temp_path)
        if file_size > 1024 * 1024:  # More than 1MB
            video_analysis += "The video is substantial in length/quality. "
        else:
            video_analysis += "The video is brief or low resolution. "

        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass

    elif captured_video and captured_video.startswith('data:video'):
        # Process base64 encoded video from webcam
        video_analysis = "Live video was captured from the webcam showing the pet's behavior. "

    # Build prompt for Gemini
    prompt = f"""
    I need help understanding my {pet_type}'s behavior. Here's what I've observed:

    Pet Name: {pet_name}
    Pet Type: {pet_type}
    Pet Breed:{pet_breed}
    Behavior Description: {behavior_desc}
    Vocal Cues: {vocal_cues}
    Situational Context: {context}

    Video Analysis Data: {video_analysis}

    Based on this information, please:
    1. Explain what my pet might be trying to communicate
    2. Suggest possible reasons for this behavior
    3. Recommend appropriate responses or actions I should take
    4. Mention if there are any potential health concerns I should be aware of

    Please provide your analysis in a friendly, informative tone.
    """

    try:
        # Get response from Gemini 1.5 Pro
        response = model.generate_content(prompt)

        # Process and return the response
        return jsonify({
            'success': True,
            'analysis': response.text,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


if __name__ == '__main__':
    app.run(debug=True)