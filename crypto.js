export async function initCrypto() {
    // Generate Identity Key Ed25519
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "Ed25519" },
        false, // Private key tidak bisa dicolong JS
        ["sign", "verify"]
    );
    return keyPair;
}

export async function exportPubKey(publicKey) {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}
