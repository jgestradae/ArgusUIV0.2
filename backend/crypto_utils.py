"""
Cryptography utilities for encrypting sensitive configuration data
Uses Fernet (symmetric encryption) for encrypting AD credentials
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

class ConfigEncryption:
    """Handles encryption/decryption of sensitive configuration data"""
    
    def __init__(self):
        # Get master key from environment or generate one
        master_key = os.getenv('ENCRYPTION_MASTER_KEY', '')
        
        if not master_key:
            # Generate a new master key if none exists
            master_key = Fernet.generate_key().decode()
            logger.warning("No ENCRYPTION_MASTER_KEY found. Generated new key. Add to .env file!")
            logger.warning(f"Add this to .env: ENCRYPTION_MASTER_KEY={master_key}")
        
        # Derive encryption key from master key
        if isinstance(master_key, str):
            master_key = master_key.encode()
        
        # Use PBKDF2HMAC to derive a proper Fernet key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'argusui_salt_2024',  # Fixed salt for consistent key derivation
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(master_key))
        
        self.cipher = Fernet(key)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a string
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Encrypted string (base64 encoded)
        """
        if not plaintext:
            return ""
        
        try:
            encrypted = self.cipher.encrypt(plaintext.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Encryption error: {str(e)}")
            raise
    
    def decrypt(self, encrypted_text: str) -> str:
        """
        Decrypt an encrypted string
        
        Args:
            encrypted_text: Encrypted string to decrypt
            
        Returns:
            Decrypted plaintext string
        """
        if not encrypted_text:
            return ""
        
        try:
            decrypted = self.cipher.decrypt(encrypted_text.encode())
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption error: {str(e)}")
            raise
    
    def encrypt_dict(self, data: dict, keys_to_encrypt: list) -> dict:
        """
        Encrypt specific keys in a dictionary
        
        Args:
            data: Dictionary containing data
            keys_to_encrypt: List of keys to encrypt
            
        Returns:
            Dictionary with encrypted values
        """
        encrypted_data = data.copy()
        
        for key in keys_to_encrypt:
            if key in encrypted_data and encrypted_data[key]:
                encrypted_data[key] = self.encrypt(str(encrypted_data[key]))
        
        return encrypted_data
    
    def decrypt_dict(self, data: dict, keys_to_decrypt: list) -> dict:
        """
        Decrypt specific keys in a dictionary
        
        Args:
            data: Dictionary containing encrypted data
            keys_to_decrypt: List of keys to decrypt
            
        Returns:
            Dictionary with decrypted values
        """
        decrypted_data = data.copy()
        
        for key in keys_to_decrypt:
            if key in decrypted_data and decrypted_data[key]:
                try:
                    decrypted_data[key] = self.decrypt(decrypted_data[key])
                except:
                    # If decryption fails, might be plaintext (for backward compatibility)
                    pass
        
        return decrypted_data


# Global encryption instance
_encryption_instance = None

def get_encryption():
    """Get or create global encryption instance"""
    global _encryption_instance
    if _encryption_instance is None:
        _encryption_instance = ConfigEncryption()
    return _encryption_instance
