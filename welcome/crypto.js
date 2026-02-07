// Lokasi: /crypto.js
"use strict";

const DB_NAME = "privatechat-keys";
const STORE = "identity";

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function generateIdentity() {
    const keyPair = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        false, 
        ["sign", "verify"]
    );
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    return new Promise((resolve, reject) => {
        store.put(keyPair, "keypair");
        tx.oncomplete = () => resolve(keyPair);
        tx.onerror = () => reject(tx.error);
    });
}

export async function exportPublicKey(publicKey) {
    const raw = await crypto.subtle.exportKey("raw", publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
}
