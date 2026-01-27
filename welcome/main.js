"use strict";

import { hasIdentity, generateIdentity, exportPublicKey } from "./crypto.js";

if (!window.isSecureContext) {
  alert("HTTPS required.");
  throw new Error("Insecure context");
}

if (window.top !== window.self) {
  document.body.innerHTML = "";
  throw new Error("Framing blocked");
}

const btn = document.getElementById("continueBtn");

btn.addEventListener("click", async () => {
  if (await hasIdentity()) {
    alert("Identitas sudah ada. Siap ke chat.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Membuat identitas…";

  const { publicKey } = await generateIdentity();
  const pub = await exportPublicKey(publicKey);

  alert("Identitas dibuat.\n\nPublic Key:\n" + pub);
});
