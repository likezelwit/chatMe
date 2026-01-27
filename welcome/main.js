"use strict";

// Secure context check
if (!window.isSecureContext) {
  alert("Aplikasi ini harus dijalankan lewat HTTPS.");
  throw new Error("Insecure context");
}

// Clickjacking fallback
if (window.top !== window.self) {
  document.body.innerHTML = "";
  throw new Error("Framing blocked");
}

document.getElementById("continueBtn").addEventListener("click", () => {
  alert("Tahap berikutnya: Setup Identitas 🔐");
  // nanti redirect ke setup / chat
});
