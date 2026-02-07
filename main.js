"use strict";
import { generateMnemonic, createIdentity, exportPubKey, saveIdentity } from './crypto.js';

const enterBtn = document.getElementById("enterBtn");
const landingView = document.getElementById("landing-view");
const setupView = document.getElementById("setup-view");
const mnemonicDisplay = document.getElementById("mnemonic-display");

if (!window.isSecureContext) {
    alert("Wajib menggunakan HTTPS!");
}

enterBtn?.addEventListener("click", async () => {
    try {
        enterBtn.innerText = "Generating Keys...";
        enterBtn.disabled = true;

        // 1. Generate Kunci & Mnemonic
        const mnemonic = generateMnemonic();
        const keys = await createIdentity();
        const pubKeyB64 = await exportPubKey(keys.publicKey);

        // 2. Simpan secara lokal
        await saveIdentity(keys, pubKeyB64);

        // 3. Update UI
        mnemonicDisplay.innerText = mnemonic;
        landingView.style.display = "none";
        setupView.style.display = "block";

    } catch (err) {
        console.error("Gagal Setup:", err);
        alert("Terjadi kesalahan teknis.");
        enterBtn.disabled = false;
    }
});

document.getElementById("confirmBtn")?.addEventListener("click", () => {
    window.location.href = "/chat.html";
});
