import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

/**
 * 生成 SHA256 哈希值
 * @param data 要哈希的数据
 * @returns SHA256 哈希值（十六进制字符串）
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * 生成文件夹的唯一 key
 * @param folderName 文件夹名称
 * @param existingKeys 已存在的 key 集合，用于检测冲突
 * @returns 唯一的 key（SHA256 的前10位）
 */
export function generateFolderKey(
  folderName: string,
  existingKeys: Set<string> = new Set(),
): string {
  let hash = sha256(folderName);
  let key = hash.substring(0, 10);

  // 如果遇到冲突，继续 sha256 直到不冲突
  while (existingKeys.has(key)) {
    hash = sha256(hash);
    key = hash.substring(0, 10);
  }

  return key;
}

/**
 * Derive key and IV from password + salt using OpenSSL's EVP_BytesToKey (MD5).
 * Compatible with CryptoJS.AES passphrase-based encryption format.
 */
function evpBytesToKey(
  password: string,
  salt: Buffer,
): { key: Buffer; iv: Buffer } {
  const keyLen = 32;
  const ivLen = 16;
  const data = Buffer.concat([Buffer.from(password), salt]);
  const parts: Buffer[] = [];
  let last: Buffer = Buffer.alloc(0);
  while (Buffer.concat(parts).length < keyLen + ivLen) {
    last = Buffer.from(
      createHash('md5')
        .update(Buffer.concat([last, data]))
        .digest(),
    );
    parts.push(last);
  }
  const buf = Buffer.concat(parts);
  return {
    key: buf.subarray(0, keyLen),
    iv: buf.subarray(keyLen, keyLen + ivLen),
  };
}

/**
 * 简单的对称加密工具
 * 使用 AES 加密算法
 */
export class SimpleCrypto {
  /**
   * 加密数据
   * @param data 要加密的数据
   * @param password 加密密码
   * @returns 加密后的字符串
   */
  static encrypt(data: string, password: string): string {
    try {
      const salt = randomBytes(8);
      const { key, iv } = evpBytesToKey(password, salt);
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final(),
      ]);
      return Buffer.concat([Buffer.from('Salted__'), salt, encrypted]).toString(
        'base64',
      );
    } catch (error) {
      throw new Error('加密失败');
    }
  }

  /**
   * 解密数据
   * @param encryptedData 加密的数据
   * @param password 解密密码
   * @returns 解密后的字符串
   */
  static decrypt(encryptedData: string, password: string): string {
    try {
      const input = Buffer.from(encryptedData, 'base64');
      const salt = input.subarray(8, 16);
      const ciphertext = input.subarray(16);
      const { key, iv } = evpBytesToKey(password, salt);
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');

      if (!decrypted) {
        throw new Error('解密失败，请检查密码是否正确');
      }

      return decrypted;
    } catch (error) {
      throw new Error('解密失败，请检查密码是否正确');
    }
  }

  /**
   * 验证密码是否能正确解密数据
   * @param encryptedData 加密的数据
   * @param password 密码
   * @returns 是否能正确解密
   */
  static canDecrypt(encryptedData: string, password: string): boolean {
    try {
      const decrypted = this.decrypt(encryptedData, password);
      return decrypted.length > 0;
    } catch {
      return false;
    }
  }
}
