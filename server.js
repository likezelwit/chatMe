const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

const clients = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        
        // Register client dengan Public Key mereka
        if (msg.type === 'register') {
            clients.set(msg.pubKey, ws);
            console.log(`User registered: ${msg.pubKey.slice(0, 10)}...`);
        }

        // Relay pesan ke target tanpa menyentuh enkripsi
        if (msg.type === 'message') {
            const targetWs = clients.get(msg.targetPubKey);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(JSON.stringify({
                    from: msg.fromPubKey,
                    payload: msg.payload // Ini ciphertext (acak)
                }));
            }
        }
    });

    ws.on('close', () => {
        // Cleanup on disconnect
        for (let [pubKey, clientWs] of clients.entries()) {
            if (clientWs === ws) { clients.delete(pubKey); break; }
        }
    });
});

console.log("Relay Server running...");
