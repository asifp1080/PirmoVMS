import { KMSClient, EncryptCommand, DecryptCommand, GenerateDataKeyCommand } from '@aws-sdk/client-kms';
import * as crypto from 'crypto';

export interface EncryptionConfig {
  kmsKeyId: string;
  region: string;
  algorithm: string;
}

export interface EncryptedData {
  encryptedValue: string;
  dataKey: string;
  iv: string;
  tag: string;
}

export class FieldEncryption {
  private kmsClient: KMSClient;
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig) {
    this.config = config;
    this.kmsClient = new KMSClient({ region: config.region });
  }

  /**
   * Encrypt a field value using envelope encryption
   * 1. Generate a data encryption key (DEK) using KMS
   * 2. Encrypt the plaintext with the DEK using AES-256-GCM
   * 3. Return the encrypted data and encrypted DEK
   */
  async encryptField(plaintext: string): Promise<EncryptedData> {
    if (!plaintext || plaintext.trim() === '') {
      throw new Error('Cannot encrypt empty or null value');
    }

    try {
      // Generate a new data encryption key
      const generateKeyCommand = new GenerateDataKeyCommand({
        KeyId: this.config.kmsKeyId,
        KeySpec: 'AES_256',
      });

      const keyResult = await this.kmsClient.send(generateKeyCommand);
      
      if (!keyResult.Plaintext || !keyResult.CiphertextBlob) {
        throw new Error('Failed to generate data encryption key');
      }

      // Use the plaintext DEK to encrypt the data
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', keyResult.Plaintext);
      cipher.setAAD(Buffer.from('vms-pii-encryption'));

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const tag = cipher.getAuthTag();

      return {
        encryptedValue: encrypted,
        dataKey: Buffer.from(keyResult.CiphertextBlob).toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt a field value using envelope encryption
   * 1. Decrypt the DEK using KMS
   * 2. Use the DEK to decrypt the actual data
   */
  async decryptField(encryptedData: EncryptedData): Promise<string> {
    if (!encryptedData.encryptedValue || !encryptedData.dataKey) {
      throw new Error('Invalid encrypted data structure');
    }

    try {
      // Decrypt the data encryption key using KMS
      const decryptKeyCommand = new DecryptCommand({
        CiphertextBlob: Buffer.from(encryptedData.dataKey, 'base64'),
      });

      const keyResult = await this.kmsClient.send(decryptKeyCommand);
      
      if (!keyResult.Plaintext) {
        throw new Error('Failed to decrypt data encryption key');
      }

      // Use the decrypted DEK to decrypt the data
      const decipher = crypto.createDecipher('aes-256-gcm', keyResult.Plaintext);
      decipher.setAAD(Buffer.from('vms-pii-encryption'));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'base64'));

      let decrypted = decipher.update(encryptedData.encryptedValue, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash a field value for searching (one-way)
   * Used for creating searchable hashes of PII
   */
  hashField(plaintext: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(plaintext, actualSalt, 10000, 64, 'sha512');
    return `${actualSalt}:${hash.toString('hex')}`;
  }

  /**
   * Verify a plaintext value against a hash
   */
  verifyHash(plaintext: string, hash: string): boolean {
    const [salt, originalHash] = hash.split(':');
    const testHash = crypto.pbkdf2Sync(plaintext, salt, 10000, 64, 'sha512');
    return originalHash === testHash.toString('hex');
  }

  /**
   * Mask PII for display purposes
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
      : '*'.repeat(local.length);
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask phone number for display
   */
  maskPhone(phone: string): string {
    if (!phone) return '***';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '*'.repeat(cleaned.length);
    
    const lastFour = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 4);
    
    return `${masked}${lastFour}`;
  }
}

// Decorator for automatic field encryption
export function EncryptedField(target: any, propertyKey: string) {
  const metadataKey = Symbol('encryptedFields');
  
  if (!Reflect.hasMetadata(metadataKey, target.constructor)) {
    Reflect.defineMetadata(metadataKey, [], target.constructor);
  }
  
  const encryptedFields = Reflect.getMetadata(metadataKey, target.constructor);
  encryptedFields.push(propertyKey);
}

// Utility to get encrypted fields from a class
export function getEncryptedFields(target: any): string[] {
  const metadataKey = Symbol('encryptedFields');
  return Reflect.getMetadata(metadataKey, target) || [];
}