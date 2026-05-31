const ENCRYPTION_SALT = "PEDExpress_Offline_Secure_Salt";

async function getKey(password: string) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(ENCRYPTION_SALT),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(text: string, password: string): Promise<string> {
  const key = await getKey(password);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(text)
  );
  
  const ivArray = Array.from(iv);
  const encryptedArray = Array.from(new Uint8Array(encrypted));
  const combined = JSON.stringify({ iv: ivArray, data: encryptedArray });
  
  return btoa(combined);
}

export async function decryptText(encryptedBase64: string, password: string): Promise<string> {
  try {
    const key = await getKey(password);
    const combined = JSON.parse(atob(encryptedBase64));
    
    const iv = new Uint8Array(combined.iv);
    const encryptedData = new Uint8Array(combined.data);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedData
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "Error: Could not decrypt entry. Incorrect password or corrupted data.";
  }
}