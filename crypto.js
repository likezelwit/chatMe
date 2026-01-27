"use strict";

// Fungsi buat generate 'Mnemonic' sederhana (Entropy)
export function generateMnemonic() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('-');
}

// Fungsi bikin kunci Ed25519 (Standar Signal/WhatsApp)
export async function createIdentity() {
  return await window.crypto.subtle.generateKey(
    { name: "Ed25519" },
    false, // false = kunci privat TIDAK BISA dicolong lewat console/script (non-extractable)
    ["sign", "verify"]
  );
}

// Simpan kunci ke IndexedDB (Brankas lokal browser)
export async function saveIdentity(keyPair) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("PrivateChatDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("identity")) db.createObjectStore("identity");
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction("identity", "readwrite");
      const store = tx.objectStore("identity");
      store.put(keyPair.privateKey, "privKey");
      store.put(keyPair.publicKey, "pubKey");
      tx.oncomplete = () => resolve();
    };
    request.onerror = () => reject("Gagal akses storage aman.");
  });
}
