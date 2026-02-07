// chat/chat.js
const socket = new WebSocket('ws://localhost:8080'); // Sesuaikan dengan port server Anda

const myPubKey = localStorage.getItem('publicKey');
const myPrivKeyB64 = localStorage.getItem('privateKey');

// Tampilkan ID (Public Key) sendiri
document.getElementById('my-id').innerText = `ID Anda: ${myPubKey.slice(0, 20)}...`;

socket.onopen = () => {
    // Registrasi ke server saat koneksi terbuka
    socket.send(JSON.stringify({
        type: 'register',
        pubKey: myPubKey
    }));
};

socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'incoming') {
        const decrypted = await decryptMessage(data.payload);
        displayMessage(data.from, decrypted, 'received');
    } else if (data.type === 'error') {
        alert(data.content);
    }
};

async function sendMessage() {
    const targetPubKey = document.getElementById('targetId').value;
    const text = document.getElementById('messageInput').value;

    if (!targetPubKey || !text) return alert("Isi ID tujuan dan pesan!");

    // ENKRIPSI PESAN
    const encryptedData = await encryptMessage(targetPubKey, text);

    socket.send(JSON.stringify({
        type: 'message',
        targetPubKey: targetPubKey,
        fromPubKey: myPubKey,
        payload: encryptedData
    }));

    displayMessage("Anda", text, 'sent');
    document.getElementById('messageInput').value = "";
}

async function encryptMessage(targetPubKeyB64, text) {
    const binaryKey = Uint8Array.from(atob(targetPubKeyB64), c => c.charCodeAt(0));
    const pubKey = await window.crypto.subtle.importKey(
        "spki", binaryKey, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]
    );

    const encoded = new TextEncoder().encode(text);
    const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKey, encoded);
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

async function decryptMessage(ciphertextB64) {
    const binaryKey = Uint8Array.from(atob(myPrivKeyB64), c => c.charCodeAt(0));
    const privKey = await window.crypto.subtle.importKey(
        "pkcs8", binaryKey, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]
    );

    const encrypted = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, encrypted);
    return new TextDecoder().decode(decrypted);
}

function displayMessage(sender, text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `<strong>${sender.slice(0,10)}:</strong> <p>${text}</p>`;
    document.getElementById('chat-box').appendChild(div);
}

document.getElementById('sendBtn').onclick = sendMessage;
