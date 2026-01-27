"use strict";

/*
  Welcome Flow Controller
  No tracking
  No storage yet
*/

// Clickjacking protection
if (window.top !== window.self) {
  document.body.innerHTML = "";
  throw new Error("Embedding blocked");
}

function showStep(id) {
  document.querySelectorAll(".step").forEach(s => {
    s.classList.add("hidden");
  });
  document.getElementById(id).classList.remove("hidden");
}

// Step 1 → Step 2
document.querySelectorAll("[data-next]").forEach(btn => {
  btn.addEventListener("click", () => {
    showStep(btn.dataset.next);
  });
});

// Agreement checkbox
const agreeBox = document.getElementById("agreeBox");
const agreeBtn = document.getElementById("agreeBtn");

if (agreeBox && agreeBtn) {
  agreeBox.addEventListener("change", () => {
    agreeBtn.disabled = !agreeBox.checked;
  });

  agreeBtn.addEventListener("click", () => {
    showStep("step3");
  });
}

// Create identity (placeholder)
const createBtn = document.getElementById("createIdentityBtn");

if (createBtn) {
  createBtn.addEventListener("click", async () => {
    createBtn.disabled = true;
    createBtn.textContent = "Membuat identitas...";

    // Placeholder — crypto logic coming next
    await new Promise(r => setTimeout(r, 800));

    showStep("step4");
  });
}

// Enter chat (next phase)
const enterChatBtn = document.getElementById("enterChatBtn");

if (enterChatBtn) {
  enterChatBtn.addEventListener("click", () => {
    alert("Chat UI belum dibuat.\nTahap selanjutnya.");
  });
}
