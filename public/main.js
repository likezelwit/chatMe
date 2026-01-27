"use strict";

/*
  Security Guards:
  - No tracking
  - No analytics
  - No fingerprinting
*/

// Clickjacking protection (JS fallback)
if (window.top !== window.self) {
  document.body.innerHTML = "";
  throw new Error("Embedding blocked by security policy");
}

const enterBtn = document.getElementById("enterBtn");

if (enterBtn) {
  enterBtn.addEventListener("click", () => {
    // Redirect ke welcome flow
    window.location.href = "/welcome/";
  });
}
