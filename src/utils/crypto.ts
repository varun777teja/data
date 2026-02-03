import nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

// --- Types ---
export interface KeyPair {
    publicKey: string;
    secretKey: string;
}

export interface EncryptedMessage {
    nonce: string;
    ciphertext: string;
    authorPublicKey: string;
}

// --- Utilities ---

/**
 * Generates a new random keypair for the user.
 * Curve25519 key pair.
 */
export const generateKeyPair = (): KeyPair => {
    const pair = nacl.box.keyPair();
    return {
        publicKey: encodeBase64(pair.publicKey),
        secretKey: encodeBase64(pair.secretKey),
    };
};

/**
 * Encrypts a message using the recipient's public key and sender's private key.
 * Uses XSalsa20-Poly1305 authenticated encryption.
 */
export const encryptMessage = (
    message: string,
    mySecretKey: string,
    theirPublicKey: string
): EncryptedMessage => {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageUint8 = decodeUTF8(message);

    // Decode keys from Base64
    const secretKeyUint8 = decodeBase64(mySecretKey);
    const publicKeyUint8 = decodeBase64(theirPublicKey);

    // Encrypt
    const encrypted = nacl.box(messageUint8, nonce, publicKeyUint8, secretKeyUint8);

    return {
        nonce: encodeBase64(nonce),
        ciphertext: encodeBase64(encrypted),
        authorPublicKey: encodeBase64(nacl.box.keyPair.fromSecretKey(secretKeyUint8).publicKey)
    };
};

/**
 * Decrypts a message.
 */
export const decryptMessage = (
    encryptedMsg: EncryptedMessage,
    mySecretKey: string,
    theirPublicKey: string
): string | null => {
    try {
        const nonceUint8 = decodeBase64(encryptedMsg.nonce);
        const ciphertextUint8 = decodeBase64(encryptedMsg.ciphertext);
        const secretKeyUint8 = decodeBase64(mySecretKey);
        const publicKeyUint8 = decodeBase64(theirPublicKey);

        const decrypted = nacl.box.open(ciphertextUint8, nonceUint8, publicKeyUint8, secretKeyUint8);

        if (!decrypted) return null;
        return encodeUTF8(decrypted);
    } catch (e) {
        console.error("Decryption failed", e);
        return null;
    }
};

/**
 * Simple hash for visual fingerprinting (not for crypto security, just ID generation)
 */
export const getFingerprint = (key: string): string => {
    return key.substring(0, 8) + '...' + key.substring(key.length - 8);
};
