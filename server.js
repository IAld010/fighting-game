const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 8080;

// MIME 类型
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
};

// 静态文件服务器
const server = http.createServer((req, res) => {
    const decodedUrl = decodeURIComponent(req.url);
    let filePath = path.join(__dirname, decodedUrl === '/' ? 'index.html' : decodedUrl);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        // 图片资源缓存1天，文本资源不缓存
        const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
        const headers = {
            'Content-Type': contentType,
            'Cache-Control': isImage ? 'public, max-age=86400' : 'no-cache',
        };
        res.writeHead(200, headers);
        res.end(data);
    });
});

// WebSocket 服务器
const wss = new WebSocketServer({ server });

let players = {}; // { 1: ws, 2: ws }

function broadcast(data, excludeId) {
    const msg = JSON.stringify(data);
    for (const id in players) {
        if (id != excludeId && players[id] && players[id].readyState === 1) {
            players[id].send(msg);
        }
    }
}

function broadcastAll(data) {
    const msg = JSON.stringify(data);
    for (const id in players) {
        if (players[id] && players[id].readyState === 1) {
            players[id].send(msg);
        }
    }
}

wss.on('connection', (ws) => {
    // 分配玩家ID
    let playerId = null;
    if (!players[1]) {
        playerId = 1;
    } else if (!players[2]) {
        playerId = 2;
    } else {
        ws.send(JSON.stringify({ type: 'error', msg: '房间已满' }));
        ws.close();
        return;
    }

    players[playerId] = ws;
    console.log(`Player ${playerId} connected`);

    // 告诉客户端它的玩家ID
    ws.send(JSON.stringify({ type: 'assign', playerId }));

    // 如果两个玩家都在，通知双方开始
    if (players[1] && players[2]) {
        broadcastAll({ type: 'bothReady' });
    }

    ws.on('message', (raw) => {
        let data;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            return;
        }
        data.playerId = playerId;
        // 转发给另一个玩家
        broadcast(data, playerId);
    });

    ws.on('close', () => {
        console.log(`Player ${playerId} disconnected`);
        delete players[playerId];
        broadcastAll({ type: 'opponentLeft' });
    });
});

const actualPort = process.env.PORT || PORT;
server.listen(actualPort, '0.0.0.0', () => {
    const os = require('os');
    const nets = os.networkInterfaces();
    let localIP = 'localhost';
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                localIP = net.address;
                break;
            }
        }
    }
    console.log(`服务器已启动!`);
    console.log(`本机访问: http://localhost:${actualPort}`);
    console.log(`手机访问: http://${localIP}:${actualPort}`);
});
