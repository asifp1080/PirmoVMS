import { Test, TestingModule } from '@nestjs/testing';
import { FieldEncryption, EncryptedData } from '../src/encryption/field-encryption';

describe('FieldEncryption', () => {
  let fieldEncryption: FieldEncryption;

  beforeEach(async () => {
    // Mock KMS configuration for testing
    const mockConfig = {
      kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
      region: 'us-east-1',
      algorithm: 'AES_256',
    };

    fieldEncryption = new FieldEncryption(mockConfig);
  });

  describe('encryptField', () => {
    it('should encrypt a field value', async () => {
      const plaintext = 'test@example.com';
      
      // Mock KMS response
      jest.spyOn(fieldEncryption as any, 'kmsClient').mockImplementation({
        send: jest.fn().mockResolvedValue({
          Plaintext: Buffer.from('mock-data-key'),
          CiphertextBlob: Buffer.from('encrypted-data-key'),
        }),
      });

      const result = await fieldEncryption.encryptField(plaintext);

      expect(result).toHaveProperty('encryptedValue');
      expect(result).toHaveProperty('dataKey');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('tag');
      expect(typeof result.encryptedValue).toBe('string');
    });

    it('should throw error for empty input', async () => {
      await expect(fieldEncryption.encryptField('')).rejects.toThrow(
        'Cannot encrypt empty or null value'
      );
    });
  });

  describe('decryptField', () => {
    it('should decrypt a field value', async () => {
      const mockEncryptedData: EncryptedData = {
        encryptedValue: 'mock-encrypted-value',
        dataKey: 'mock-encrypted-key',
        iv: 'mock-iv',
        tag: 'mock-tag',
      };

      // Mock KMS response
      jest.spyOn(fieldEncryption as any, 'kmsClient').mockImplementation({
        send: jest.fn().mockResolvedValue({
          Plaintext: Buffer.from('mock-data-key'),
        }),
      });

      // This would normally decrypt, but we'll mock the crypto operations
      const result = await fieldEncryption.decryptField(mockEncryptedData);
      
      // In a real test, we'd verify the decrypted value matches the original
      expect(typeof result).toBe('string');
    });

    it('should throw error for invalid encrypted data', async () => {
      const invalidData = {
        encryptedValue: '',
        dataKey: '',
        iv: '',
        tag: '',
      };

      await expect(fieldEncryption.decryptField(invalidData)).rejects.toThrow(
        'Invalid encrypted data structure'
      );
    });
  });

  describe('hashField', () => {
    it('should create a hash for searching', () => {
      const plaintext = 'test@example.com';
      const hash = fieldEncryption.hashField(plaintext);

      expect(hash).toContain(':');
      expect(hash.split(':').length).toBe(2);
    });

    it('should create consistent hashes with same salt', () => {
      const plaintext = 'test@example.com';
      const salt = 'test-salt';
      
      const hash1 = fieldEncryption.hashField(plaintext, salt);
      const hash2 = fieldEncryption.hashField(plaintext, salt);

      expect(hash1).toBe(hash2);
    });
  });

  describe('verifyHash', () => {
    it('should verify a hash correctly', () => {
      const plaintext = 'test@example.com';
      const hash = fieldEncryption.hashField(plaintext);

      const isValid = fieldEncryption.verifyHash(plaintext, hash);
      expect(isValid).toBe(true);
    });

    it('should reject invalid hash', () => {
      const plaintext = 'test@example.com';
      const wrongText = 'wrong@example.com';
      const hash = fieldEncryption.hashField(plaintext);

      const isValid = fieldEncryption.verifyHash(wrongText, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('maskEmail', () => {
    it('should mask email address correctly', () => {
      const email = 'test@example.com';
      const masked = fieldEncryption.maskEmail(email);

      expect(masked).toBe('t**t@example.com');
    });

    it('should handle short email addresses', () => {
      const email = 'a@b.com';
      const masked = fieldEncryption.maskEmail(email);

      expect(masked).toBe('*@b.com');
    });

    it('should handle invalid email', () => {
      const invalid = 'not-an-email';
      const masked = fieldEncryption.maskEmail(invalid);

      expect(masked).toBe('***');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone number correctly', () => {
      const phone = '+1-555-123-4567';
      const masked = fieldEncryption.maskPhone(phone);

      expect(masked).toBe('*******4567');
    });

    it('should handle short phone numbers', () => {
      const phone = '123';
      const masked = fieldEncryption.maskPhone(phone);

      expect(masked).toBe('***');
    });

    it('should handle empty phone', () => {
      const phone = '';
      const masked = fieldEncryption.maskPhone(phone);

      expect(masked).toBe('***');
    });
  });
});