"use strict";
import { generateMnemonic, createIdentity, saveIdentity } from './crypto.js';

// 1. Cek Keamanan Lingkungan
if (!window.isSecureContext) {
  alert("Wajib HTTPS!");
  document.body.innerHTML = "<h1>Gunakan HTTPS untuk chat aman.</h1>";
}

// 2. Clickjacking protection
if (window.top !== window.self) document.body.innerHTML = "";

const enterBtn = document.getElementById("enterBtn");
const landingView = document.getElementById("landing-view");
const setupView = document.getElementById("setup-view");
const mnemonicDisplay = document.getElementById("mnemonic-display");

// 3. Handler Tombol Masuk
enterBtn?.addEventListener("click", async () => {
  try {
    enterBtn.innerText = "Generating...";
    enterBtn.disabled = true;

    // Proses Kriptografi
    const mnemonic = generateMnemonic();
    const keys = await createIdentity();
    await saveIdentity(keys);

    // Tampilkan Mnemonic ke user
    mnemonicDisplay.innerText = mnemonic;
    landingView.style.display = "none";
    setupView.style.display = "block";

  } catch (err) {
    console.error(err);
    alert("Error: " + err);
    enterBtn.disabled = false;
  }
});

document.getElementById("confirmBtn")?.addEventListener("click", () => {
  // Pindah ke halaman chat utama
  window.location.href = "/chat.html";
});
