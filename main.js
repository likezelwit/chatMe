"use strict";

/*
  Security Guards:
  - No tracking
  - No analytics
  - No fingerprinting
*/

// Enforce Secure Context (WebCrypto requirement)
if (!window.isSecureContext) {
  alert("Aplikasi ini hanya bisa dijalankan melalui HTTPS.");
  throw new Error("Insecure context blocked");
}

// Clickjacking protection (client-side fallback)
if (window.top !== window.self) {
  document.body.innerHTML = "";
  throw new Error("Embedding blocked by security policy");
}

// Navigation handler
const enterBtn = document.getElementById("enterBtn");

if (enterBtn) {
  enterBtn.addEventListener("click", () => {
    // Redirect to chat entry point
    window.location.href = "/welcome/index.html";
  });
}
