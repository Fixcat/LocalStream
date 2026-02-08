console.log('🚀 WATCH ЗАГРУЖЕН');

const socket = io();
const streamersList = document.getElementById('streamers-list');
const viewer = document.getElementById('viewer');
const streamTitle = document.getElementById('stream-title');
const btnCamera = document.getElementById('btn-camera');
const btnScreen = document.getElementById('btn-screen');
const canvas = document.getElementById('canvas');
const info = document.getElementById('info');

let activeStreamerId = null;
let viewMode = 'camera';
let frameCount = 0;

const audio = new Audio();
audio.volume = 1.0;

socket.on('connect', () => console.log('✓ Подключено'));

socket.on('streamers-update', (list) => {
    console.log('📡 Трансляций:', list.length);
    updateList(list);
});

function updateList(list) {
    streamersList.innerHTML = '';
    
    if (list.length === 0) {
        streamersList.innerHTML = '<div class="empty-message">Нет трансляций</div>';
        viewer.style.display = 'none';
        return;
    }

    list.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'streamer-btn';
        btn.textContent = s.name;
        btn.onclick = () => {
            console.log('→ Выбрано:', s.name);
            activeStreamerId = s.id;
            frameCount = 0; // Сброс счетчика
            streamTitle.textContent = s.name;
            viewer.style.display = 'block';
            info.textContent = `Режим: ${viewMode === 'camera' ? 'Камера' : 'Экран'} | Кадров: 0`;
            updateList(list);
        };
        if (activeStreamerId === s.id) btn.classList.add('active');
        streamersList.appendChild(btn);
    });
}

btnCamera.onclick = () => {
    viewMode = 'camera';
    frameCount = 0; // Сброс счетчика
    btnCamera.classList.add('active');
    btnScreen.classList.remove('active');
    info.textContent = 'Режим: Камера | Кадров: 0';
    console.log('→ Камера');
};

btnScreen.onclick = () => {
    viewMode = 'screen';
    frameCount = 0; // Сброс счетчика
    btnScreen.classList.add('active');
    btnCamera.classList.remove('active');
    info.textContent = 'Режим: Экран | Кадров: 0';
    console.log('→ Экран');
};

socket.on('camera-frame', (data) => {
    if (data.streamerId !== activeStreamerId || viewMode !== 'camera') return;
    
    frameCount++;
    if (frameCount % 15 === 0) console.log('📹 Кадр камеры #', frameCount);
    
    // Socket.IO передает Blob как ArrayBuffer - конвертируем обратно
    const blob = new Blob([data.frame], { type: 'image/jpeg' });
    renderFrame(blob);
    info.textContent = `Режим: Камера | Кадров: ${frameCount}`;
});

socket.on('screen-frame', (data) => {
    if (data.streamerId !== activeStreamerId || viewMode !== 'screen') return;
    
    frameCount++;
    if (frameCount % 15 === 0) console.log('🖥️ Кадр экрана #', frameCount);
    
    // Socket.IO передает Blob как ArrayBuffer - конвертируем обратно
    const blob = new Blob([data.frame], { type: 'image/jpeg' });
    renderFrame(blob);
    info.textContent = `Режим: Экран | Кадров: ${frameCount}`;
});

socket.on('audio-chunk', (data) => {
    if (data.streamerId !== activeStreamerId) return;
    
    // Socket.IO передает Blob как ArrayBuffer - конвертируем обратно
    const blob = new Blob([data.chunk], { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    audio.src = url;
    audio.play().catch(() => {});
    audio.onended = () => URL.revokeObjectURL(url);
});

function renderFrame(blob) {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
    };
    img.onerror = () => {
        console.error('Ошибка загрузки изображения');
        URL.revokeObjectURL(url);
    };
    img.src = url;
}
