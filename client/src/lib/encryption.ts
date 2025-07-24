import sodium from 'libsodium-wrappers';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface EncryptedMessage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

class E2EEManager {
  private initialized = false;
  private keyPair: KeyPair | null = null;

  async initialize() {
    if (this.initialized) return;
    
    await sodium.ready;
    this.initialized = true;
  }

  async generateKeyPair(): Promise<KeyPair> {
    await this.initialize();
    
    const keyPair = sodium.crypto_box_keypair();
    this.keyPair = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
    
    // Store in localStorage for persistence across sessions
    localStorage.setItem('e2ee_public_key', sodium.to_base64(keyPair.publicKey));
    localStorage.setItem('e2ee_private_key', sodium.to_base64(keyPair.privateKey));
    
    return this.keyPair;
  }

  async loadStoredKeyPair(): Promise<KeyPair | null> {
    await this.initialize();
    
    const publicKeyB64 = localStorage.getItem('e2ee_public_key');
    const privateKeyB64 = localStorage.getItem('e2ee_private_key');
    
    if (publicKeyB64 && privateKeyB64) {
      this.keyPair = {
        publicKey: sodium.from_base64(publicKeyB64),
        privateKey: sodium.from_base64(privateKeyB64)
      };
      return this.keyPair;
    }
    
    return null;
  }

  async getOrGenerateKeyPair(): Promise<KeyPair> {
    const stored = await this.loadStoredKeyPair();
    if (stored) {
      return stored;
    }
    return await this.generateKeyPair();
  }

  async encryptMessage(message: string, recipientPublicKey: Uint8Array): Promise<EncryptedMessage> {
    await this.initialize();
    
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    const messageBytes = sodium.from_string(message);
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    
    const ciphertext = sodium.crypto_box_easy(
      messageBytes,
      nonce,
      recipientPublicKey,
      this.keyPair.privateKey
    );

    return { ciphertext, nonce };
  }

  async decryptMessage(encryptedMessage: EncryptedMessage, senderPublicKey: Uint8Array): Promise<string> {
    await this.initialize();
    
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    const decrypted = sodium.crypto_box_open_easy(
      encryptedMessage.ciphertext,
      encryptedMessage.nonce,
      senderPublicKey,
      this.keyPair.privateKey
    );

    return sodium.to_string(decrypted);
  }

  getPublicKey(): Uint8Array | null {
    return this.keyPair?.publicKey || null;
  }

  getPublicKeyBase64(): string | null {
    const publicKey = this.getPublicKey();
    return publicKey ? sodium.to_base64(publicKey) : null;
  }

  publicKeyFromBase64(base64: string): Uint8Array {
    return sodium.from_base64(base64);
  }

  clearKeys() {
    localStorage.removeItem('e2ee_public_key');
    localStorage.removeItem('e2ee_private_key');
    this.keyPair = null;
  }
}

export const e2eeManager = new E2EEManager();