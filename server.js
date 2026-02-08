const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const os = require('os');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);

// Настройки Socket.IO для бинарных данных
const io = socketIO(server, {
  maxHttpBufferSize: 10e6, // 10MB
  pingTimeout: 60000,
  cors: { origin: "*" },
  transports: ['polling', 'websocket']
});

app.use(express.static('public'));

// Редирект с корня на страницу трансляции
app.get('/', (req, res) => {
  res.redirect('/streamer.html');
});

const streamers = new Map();
let streamerIdCounter = 0;

io.on('connection', (socket) => {
  console.log('✓ Подключение:', socket.id);
  
  // Отправляем текущий список трансляций новому подключению
  socket.emit('streamers-update', Array.from(streamers.values()));

  socket.on('start-stream', (data) => {
    const streamerId = ++streamerIdCounter;
    streamers.set(socket.id, {
      id: streamerId,
      name: data.name || `Трансляция ${streamerId}`
    });
    
    socket.emit('stream-started', { streamerId });
    io.emit('streamers-update', Array.from(streamers.values()));
    
    console.log(`✓ Стример: ${data.name} (ID: ${streamerId})`);
  });

  let camFrameCount = 0;
  let scrFrameCount = 0;
  let audioCount = 0;

  socket.on('camera-frame', (data) => {
    const streamer = streamers.get(socket.id);
    if (streamer) {
      camFrameCount++;
      if (camFrameCount % 30 === 0) {
        console.log(`📹 Камера: ${camFrameCount} кадров от стримера ${streamer.id}`);
      }
      socket.broadcast.emit('camera-frame', {
        streamerId: streamer.id,
        frame: data
      });
    }
  });

  socket.on('screen-frame', (data) => {
    const streamer = streamers.get(socket.id);
    if (streamer) {
      scrFrameCount++;
      if (scrFrameCount % 30 === 0) {
        console.log(`🖥️ Экран: ${scrFrameCount} кадров от стримера ${streamer.id}`);
      }
      socket.broadcast.emit('screen-frame', {
        streamerId: streamer.id,
        frame: data
      });
    }
  });

  socket.on('audio-chunk', (data) => {
    const streamer = streamers.get(socket.id);
    if (streamer) {
      audioCount++;
      if (audioCount % 30 === 0) {
        console.log(`🔊 Аудио: ${audioCount} чанков от стримера ${streamer.id}`);
      }
      socket.broadcast.emit('audio-chunk', {
        streamerId: streamer.id,
        chunk: data
      });
    }
  });

  socket.on('disconnect', () => {
    if (streamers.has(socket.id)) {
      console.log(`✗ Отключен: ${streamers.get(socket.id).name}`);
      streamers.delete(socket.id);
      io.emit('streamers-update', Array.from(streamers.values()));
    }
  });
});

function getTailscaleIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('100.')) {
        return iface.address;
      }
    }
  }
  return null;
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     СЕРВЕР ЗАПУЩЕН!                   ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`📍 Локально: http://localhost:${PORT}`);
  
  const tsIP = getTailscaleIP();
  if (tsIP) {
    console.log(`🚀 Tailscale: http://${tsIP}:${PORT}`);
  }
  
  console.log('\n📺 Страницы:');
  console.log(`   Трансляция: /streamer.html`);
  console.log(`   Просмотр: /watch.html\n`);
  
  exec(`start http://localhost:${PORT}/streamer.html`);
});
