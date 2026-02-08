console.log('🚀 STREAMER ЗАГРУЖЕН');

const socket = io();
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const streamName = document.getElementById('stream-name');
const status = document.getElementById('status');
const preview = document.getElementById('preview');

let isStreaming = false;
let cameraStream = null;
let screenStream = null;

socket.on('connect', () => console.log('✓ Подключено'));
socket.on('stream-started', (data) => {
    console.log('✓ Стример ID:', data.streamerId);
});

startBtn.onclick = async () => {
    try {
        console.log('Запуск...');
        
        // Экран
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 15 },
            audio: true
        });
        console.log('✓ Экран');
        
        // Камера
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { frameRate: 15 },
            audio: true
        });
        console.log('✓ Камера');
        
        preview.srcObject = cameraStream;
        
        socket.emit('start-stream', { name: streamName.value });
        
        isStreaming = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        status.textContent = '✓ Активна';
        status.style.background = '#4CAF50';
        
        startCapture();
        
    } catch (e) {
        alert('Ошибка: ' + e.message);
        console.error(e);
    }
};

stopBtn.onclick = () => {
    isStreaming = false;
    
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    
    preview.srcObject = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    status.textContent = 'Не активна';
    status.style.background = '#ffeb3b';
    
    console.log('✓ Остановлено');
};

function startCapture() {
    // Камера
    const camVideo = document.createElement('video');
    camVideo.srcObject = cameraStream;
    camVideo.muted = true;
    camVideo.play();
    
    const camCanvas = document.createElement('canvas');
    camCanvas.width = 640;
    camCanvas.height = 480;
    const camCtx = camCanvas.getContext('2d');
    
    let camCount = 0;
    function captureCam() {
        if (!isStreaming) return;
        
        if (camVideo.readyState === 4) {
            camCtx.drawImage(camVideo, 0, 0, 640, 480);
            camCanvas.toBlob(blob => {
                if (blob) {
                    camCount++;
                    if (camCount % 15 === 0) console.log('📹 Камера #', camCount);
                    socket.emit('camera-frame', blob);
                }
            }, 'image/jpeg', 0.7);
        }
        
        setTimeout(captureCam, 66); // 15 FPS
    }
    
    camVideo.onloadedmetadata = () => {
        console.log('✓ Захват камеры');
        captureCam();
    };
    
    // Экран
    const scrVideo = document.createElement('video');
    scrVideo.srcObject = screenStream;
    scrVideo.muted = true;
    scrVideo.play();
    
    const scrCanvas = document.createElement('canvas');
    scrCanvas.width = 1280;
    scrCanvas.height = 720;
    const scrCtx = scrCanvas.getContext('2d');
    
    let scrCount = 0;
    function captureScr() {
        if (!isStreaming) return;
        
        if (scrVideo.readyState === 4) {
            scrCtx.drawImage(scrVideo, 0, 0, 1280, 720);
            scrCanvas.toBlob(blob => {
                if (blob) {
                    scrCount++;
                    if (scrCount % 15 === 0) console.log('🖥️ Экран #', scrCount);
                    socket.emit('screen-frame', blob);
                }
            }, 'image/jpeg', 0.7);
        }
        
        setTimeout(captureScr, 66); // 15 FPS
    }
    
    scrVideo.onloadedmetadata = () => {
        console.log('✓ Захват экрана');
        captureScr();
    };
    
    // Аудио
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(cameraStream);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    
    const recorder = new MediaRecorder(dest.stream);
    recorder.ondataavailable = e => {
        if (e.data.size > 0) socket.emit('audio-chunk', e.data);
    };
    recorder.start(200);
    console.log('✓ Захват аудио');
}
