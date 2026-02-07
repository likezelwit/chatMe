// crypto.js

// Membuat pasangan kunci RSA-2048
export async function createIdentity() {
    return await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

// Export Public Key ke format Base64 agar bisa dikirim ke server
export async function exportPubKey(publicKey) {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Fungsi simulasi Mnemonic (12 kata sederhana)
export function generateMnemonic() {
    const words = ["aman", "privasi", "kripto", "sandi", "jaga", "data", "bebas", "enkripsi", "lokal", "chat", "sinyal", "fokus"];
    return Array.from({ length: 12 }, () => words[Math.floor(Math.random() * words.length)]).join(" ");
}

// Fungsi simpan identitas (Sederhana: LocalStorage)
export async function saveIdentity(keys, pubKeyB64) {
    localStorage.setItem('publicKey', pubKeyB64);
    // Note: Di produksi, Private Key sebaiknya disimpan di IndexedDB yang lebih aman
    const privExported = await window.crypto.subtle.exportKey("pkcs8", keys.privateKey);
    localStorage.setItem('privateKey', btoa(String.fromCharCode(...new Uint8Array(privExported))));
}
