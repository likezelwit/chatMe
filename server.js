const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Map untuk menyimpan user berdasarkan Public Key mereka
const clients = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            // Registrasi User
            if (msg.type === 'register') {
                clients.set(msg.pubKey, ws);
                ws.pubKey = msg.pubKey; // Simpan referensi di objek ws
                console.log(`User Online: ${msg.pubKey.slice(0, 15)}...`);
            }

            // Meneruskan Pesan (Relay)
            if (msg.type === 'message') {
                const targetWs = clients.get(msg.targetPubKey);
                if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(JSON.stringify({
                        type: 'incoming',
                        from: msg.fromPubKey,
                        payload: msg.payload // Ciphertext mentah
                    }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', content: 'Target tidak ditemukan/offline.' }));
                }
            }
        } catch (e) {
            console.error("Format pesan salah");
        }
    });

    ws.on('close', () => {
        if (ws.pubKey) {
            clients.delete(ws.pubKey);
            console.log("User disconnected");
        }
    });
});

console.log(`Server PrivateChat aktif di port ${PORT}`);
