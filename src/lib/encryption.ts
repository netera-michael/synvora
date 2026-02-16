import "server-only";
import crypto from "crypto";

// Use a secure key from environment variables or fallback for development (NOT RECOMMENDED for production)
// In production, ENCRYPTION_KEY must be set and be 32 characters long
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "synvora-secret-key-32-chars-long";
const IV_LENGTH = 16; // AES block size

/**
 * Encrypts a text string using AES-256-CBC
 */
export function encrypt(text: string): string {
    if (!text) return text;

    // Validate key length
    if (ENCRYPTION_KEY.length !== 32) {
        console.warn("ENCRYPTION_KEY is not 32 characters long. Using default/fallback key. THIS IS INSECURE.");
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    // Cast to any to avoid TypeScript Buffer/Uint8Array mismatch issues in this environment
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY) as any, iv as any);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Decrypts an encrypted string using AES-256-CBC
 */
export function decrypt(text: string): string {
    if (!text) return text;

    try {
        const textParts = text.split(":");
        if (textParts.length !== 2) return text; // Not encrypted or invalid format

        const iv = Buffer.from(textParts[0], "hex");
        const encryptedText = Buffer.from(textParts[1], "hex");

        // Validate key length
        if (ENCRYPTION_KEY.length !== 32) {
            console.warn("ENCRYPTION_KEY is not 32 characters long. Using default/fallback key. THIS IS INSECURE.");
        }

        // Cast to any to avoid TypeScript Buffer/Uint8Array mismatch issues in this environment
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY) as any, iv as any);
        let decrypted = decipher.update(encryptedText as any);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error("Decryption failed:", error);
        // Return original text if decryption fails (fallback for non-encrypted legacy data)
        return text;
    }
}
