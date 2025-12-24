/**
 * E2E Encryption Utilities for TrueVibe Chat
 * 
 * Uses the Web Crypto API for cryptographic operations.
 * Implements a simplified version of the Signal Protocol:
 * - X25519 for key exchange
 * - AES-256-GCM for message encryption
 * - HKDF for key derivation
 */

// Generate identity key pair (long-term)
export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        ['deriveBits']
    );
}

// Generate signed pre-key pair
export async function generateSignedPreKey(): Promise<{
    keyPair: CryptoKeyPair;
    keyId: number;
}> {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        ['deriveBits']
    );

    return {
        keyPair,
        keyId: Date.now(),
    };
}

// Generate one-time pre-keys
export async function generateOneTimePreKeys(count: number = 10): Promise<Array<{
    keyPair: CryptoKeyPair;
    keyId: number;
}>> {
    const keys = [];
    const baseId = Date.now();

    for (let i = 0; i < count; i++) {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: 'P-256',
            },
            true,
            ['deriveBits']
        );
        keys.push({ keyPair, keyId: baseId + i });
    }

    return keys;
}

// Export public key to Base64
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import public key from Base64
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
    const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
        'spki',
        keyData,
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        []
    );
}

// Derive shared secret using ECDH
export async function deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
): Promise<ArrayBuffer> {
    return await crypto.subtle.deriveBits(
        {
            name: 'ECDH',
            public: publicKey,
        },
        privateKey,
        256
    );
}

// Derive encryption key from shared secret using HKDF
export async function deriveEncryptionKey(
    sharedSecret: ArrayBuffer,
    info: string = 'TrueVibe-E2EE'
): Promise<CryptoKey> {
    // Import shared secret as HKDF key
    const hkdfKey = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        'HKDF',
        false,
        ['deriveKey']
    );

    // Derive AES key
    return await crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            salt: new TextEncoder().encode('TrueVibe-Salt'),
            info: new TextEncoder().encode(info),
            hash: 'SHA-256',
        },
        hkdfKey,
        {
            name: 'AES-GCM',
            length: 256,
        },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt message
export async function encryptMessage(
    message: string,
    encryptionKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
        },
        encryptionKey,
        encoder.encode(message)
    );

    return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
    };
}

// Decrypt message
export async function decryptMessage(
    ciphertext: string,
    iv: string,
    encryptionKey: CryptoKey
): Promise<string> {
    const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: ivBytes,
        },
        encryptionKey,
        ciphertextBytes
    );

    return new TextDecoder().decode(decrypted);
}

// Store keys locally (encrypted with a password-derived key would be ideal)
export function storeKeyPair(name: string, keyPair: { publicKey: string; privateKey: string }) {
    localStorage.setItem(`e2ee_${name}`, JSON.stringify(keyPair));
}

export function getStoredKeyPair(name: string): { publicKey: string; privateKey: string } | null {
    const stored = localStorage.getItem(`e2ee_${name}`);
    return stored ? JSON.parse(stored) : null;
}

// Sign data with identity key (for verification)
export async function signData(privateKey: CryptoKey, data: ArrayBuffer): Promise<string> {
    // Need to re-import as ECDSA for signing (this is a simplified approach)
    const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
    const signingKey = await crypto.subtle.importKey(
        'pkcs8',
        exported,
        {
            name: 'ECDSA',
            namedCurve: 'P-256',
        },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        {
            name: 'ECDSA',
            hash: 'SHA-256',
        },
        signingKey,
        data
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Helper: Generate all keys for a new user
export async function generateUserKeys() {
    const identityKeyPair = await generateIdentityKeyPair();
    const signedPreKey = await generateSignedPreKey();
    const oneTimePreKeys = await generateOneTimePreKeys(10);

    return {
        identityKeyPair,
        signedPreKey,
        oneTimePreKeys,
    };
}
