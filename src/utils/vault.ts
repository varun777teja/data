/**
 * Secure Vault Implementation
 * Uses Web Crypto API (PBKDF2 + AES-GCM) to encrypt the user's private key with a PIN.
 * This ensures "Zero Knowledge" - the server never sees the PIN or the private key.
 */

export class IdentityVault {

    // Derives a key from a PIN using PBKDF2
    private static async deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(pin),
            "PBKDF2",
            false,
            ["deriveBits", "deriveKey"]
        );

        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256",
            },
            keyMaterial,
            { "name": "AES-GCM", "length": 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    // Encrypts text (e.g., secretKey) with a PIN
    static async lock(secretData: string, pin: string): Promise<string> {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(pin, salt);

        const enc = new TextEncoder();
        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(secretData)
        );

        // Pack everything: salt + iv + ciphertext
        // We'll use JSON + Base64 for simplicity in this demo, usually we'd pack binary.
        const packageData = {
            salt: Array.from(salt),
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(encryptedContent))
        };

        return JSON.stringify(packageData);
    }

    // Decrypts text with a PIN
    static async unlock(vaultString: string, pin: string): Promise<string | null> {
        try {
            const pkg = JSON.parse(vaultString);
            const salt = new Uint8Array(pkg.salt);
            const iv = new Uint8Array(pkg.iv);
            const data = new Uint8Array(pkg.data);

            const key = await this.deriveKey(pin, salt);

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                data
            );

            const dec = new TextDecoder();
            return dec.decode(decryptedBuffer);
        } catch (e) {
            console.error("Vault unlock failed:", e);
            return null;
        }
    }
}
