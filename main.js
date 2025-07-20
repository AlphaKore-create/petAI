// Global variables
let mediaRecorder;
let recordedChunks = [];
let stream = null;
let isRecording = false;

// DOM elements
const videoElement = document.getElementById('videoElement');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const startCameraBtn = document.getElementById('startCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const stopBtn = document.getElementById('stopBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');
const cameraFormContainer = document.getElementById('cameraFormContainer');
const capturedVideoInput = document.getElementById('captured_video');

// Form elements
const petForm = document.getElementById('petForm');
const cameraForm = document.getElementById('cameraForm');
const loader = document.getElementById('loader');
const analysisResult = document.getElementById('analysisResult');
const analysisContent = document.getElementById('analysisContent');
const timestamp = document.getElementById('timestamp');
const newAnalysisBtn = document.getElementById('newAnalysisBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Initialize tooltips
const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})

// Camera functionality
startCameraBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        videoElement.srcObject = stream;
        videoElement.style.display = 'block';
        cameraPlaceholder.style.display = 'none';

        // Show relevant buttons
        startCameraBtn.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        stopCameraBtn.style.display = 'inline-block';

        console.log('Camera started successfully');
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Unable to access camera. Please ensure you have a camera connected and have granted permission.');
    }
});

stopCameraBtn.addEventListener('click', () => {
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        stream = null;

        // Reset UI
        videoElement.srcObject = null;
        videoElement.style.display = 'none';
        cameraPlaceholder.style.display = 'flex';

        startCameraBtn.style.display = 'inline-block';
        captureBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        stopCameraBtn.style.display = 'none';

        // If we were recording, stop it
        if (isRecording) {
            stopRecording();
        }

        console.log('Camera stopped');
    }
});

captureBtn.addEventListener('click', () => {
    if (stream) {
        // Setup recorder
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);

            // Convert to base64 for submission
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = reader.result;
                capturedVideoInput.value = base64data;

                // Show the form to add details
                cameraFormContainer.style.display = 'block';

                console.log('Video recorded and processed');
            };
        };

        // Start recording
        mediaRecorder.start();
        isRecording = true;

        // Update UI
        captureBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';

        // Add recording indicator
        const indicator = document.createElement('div');
        indicator.className = 'recording-indicator';
        videoElement.parentElement.appendChild(indicator);

        console.log('Recording started');
    }
});

stopBtn.addEventListener('click', stopRecording);

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;

        // Update UI
        stopBtn.style.display = 'none';
        captureBtn.style.display = 'inline-block';

        // Remove recording indicator
        const indicator = document.querySelector('.recording-indicator');
        if (indicator) {
            indicator.remove();
        }

        console.log('Recording stopped');
    }
}

// Form submission handlers
petForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Show loading
    loader.style.display = 'block';

    try {
        const formData = new FormData(petForm);
        const response = await fetch('/analyze_behavior', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        displayAnalysisResult(result);
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('There was an error analyzing the pet behavior. Please try again.');
        loader.style.display = 'none';
    }
});

cameraForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Show loading
    loader.style.display = 'block';

    try {
        const formData = new FormData(cameraForm);
        const response = await fetch('/analyze_behavior', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        displayAnalysisResult(result);
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('There was an error analyzing the pet behavior. Please try again.');
        loader.style.display = 'none';
    }
});

function displayAnalysisResult(result) {
    // Hide loading
    loader.style.display = 'none';

    if (result.success) {
        // Format the analysis with markdown
        const formattedAnalysis = result.analysis
            .replace(/\n\n/g, '<br><br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Display results
        analysisContent.innerHTML = formattedAnalysis;
        timestamp.textContent = `Analysis completed: ${result.timestamp}`;
        analysisResult.style.display = 'block';

        // Scroll to results
        analysisResult.scrollIntoView({ behavior: 'smooth' });

        // Hide form sections
        document.querySelector('.tab-content').style.display = 'none';
    } else {
        alert('Error: ' + result.error);
    }
}

// Reset for new analysis
newAnalysisBtn.addEventListener('click', () => {
    // Show form sections
    document.querySelector('.tab-content').style.display = 'block';

    // Hide results
    analysisResult.style.display = 'none';

    // Reset forms
    petForm.reset();
    cameraForm.reset();
    capturedVideoInput.value = '';

    // Return to first tab
    const formTab = document.getElementById('form-tab');
    const tab = new bootstrap.Tab(formTab);
    tab.show();

    // Reset camera form container
    cameraFormContainer.style.display = 'none';
});

// Download analysis as text file
downloadBtn.addEventListener('click', () => {
    const petName = document.getElementById('pet_name').value || document.getElementById('cam_pet_name').value || 'pet';
    const fileName = `${petName}_behavior_analysis_${new Date().toISOString().slice(0,10)}.txt`;

    const content = `Pet Behavior Analysis
${timestamp.textContent}

${analysisContent.innerText}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);
});

// Check for required permissions
document.addEventListener('DOMContentLoaded', () => {
    // Check if we have camera permissions
    navigator.permissions.query({ name: 'camera' })
        .then(permissionStatus => {
            console.log('Camera permission status:', permissionStatus.state);

            // If permission is already granted, we can simplify the UX
            if (permissionStatus.state === 'granted') {
                startCameraBtn.textContent = 'Enable Camera';
            }

            permissionStatus.onchange = () => {
                console.log('Camera permission status changed to:', permissionStatus.state);
            };
        })
        .catch(error => {
            console.log('Camera permission check error:', error);
        });
});