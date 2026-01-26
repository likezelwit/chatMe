"use strict";

/*
  Security Guards:
  - No tracking
  - No analytics
  - No fingerprinting
*/

// Clickjacking protection (client-side fallback)
if (window.top !== window.self) {
  document.body.innerHTML = "";
  throw new Error("Embedding blocked by security policy");
}

const enterBtn = document.getElementById("enterBtn");

if (enterBtn) {
  enterBtn.addEventListener("click", () => {
    alert(
      "Chat belum aktif.\n\n" +
      "Security perimeter:\n" +
      "- CSP aktif\n" +
      "- HTTPS enforced\n" +
      "- Clickjacking blocked\n\n" +
      "Siap lanjut ke E2EE."
    );
  });
}
