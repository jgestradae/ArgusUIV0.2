"""
Active Directory API endpoints
Admin-only endpoints for AD configuration and testing
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging
from datetime import datetime

from auth import get_current_user, require_admin
from models import User
from auth_ad import ad_authenticator
from crypto_utils import get_encryption

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ad", tags=["Active Directory"])


class ADConfigRequest(BaseModel):
    """Request model for AD configuration (will be encrypted)"""
    enabled: bool
    server: str
    port: int
    domain: str
    base_dn: str
    bind_user: Optional[str] = ""
    bind_password: Optional[str] = ""
    use_ssl: bool = False


class ADTestRequest(BaseModel):
    """Request model for AD connection test"""
    username: str
    password: str


@router.get("/status")
async def get_ad_status(current_user: User = Depends(require_admin)):
    """
    Get Active Directory connection status and configuration
    Admin only
    """
    try:
        config = ad_authenticator.get_config()
        connection_test = ad_authenticator.test_connection()
        
        return {
            'success': True,
            'config': config,
            'connection': connection_test
        }
    except Exception as e:
        logger.error(f"Error getting AD status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-connection")
async def test_ad_connection(current_user: User = Depends(require_admin)):
    """
    Test Active Directory server connection
    Admin only
    """
    try:
        result = ad_authenticator.test_connection()
        return result
    except Exception as e:
        logger.error(f"Error testing AD connection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-auth")
async def test_ad_authentication(
    request: ADTestRequest,
    current_user: User = Depends(require_admin)
):
    """
    Test Active Directory authentication with credentials
    Admin only
    """
    try:
        result = ad_authenticator.authenticate(request.username, request.password)
        
        # Don't return sensitive user info in test
        if result['success']:
            return {
                'success': True,
                'message': 'Authentication successful',
                'username': request.username
            }
        else:
            return {
                'success': False,
                'error': result['error']
            }
    except Exception as e:
        logger.error(f"Error testing AD authentication: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_ad_config(current_user: User = Depends(require_admin)):
    """
    Get Active Directory configuration (sanitized)
    Admin only
    """
    try:
        config = ad_authenticator.get_config()
        return {
            'success': True,
            'config': config
        }
    except Exception as e:
        logger.error(f"Error getting AD config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/config/save")
async def save_ad_config(
    config_request: ADConfigRequest,
    current_user: User = Depends(require_admin)
):
    """
    Save Active Directory configuration (encrypted in database)
    Admin only
    
    All sensitive fields are encrypted before storage
    """
    try:
        from server import db
        
        # Get encryption instance
        encryption = get_encryption()
        
        # Fields to encrypt
        sensitive_fields = ['server', 'domain', 'base_dn', 'bind_user', 'bind_password']
        
        # Prepare config data
        config_data = config_request.dict()
        
        # Encrypt sensitive fields
        encrypted_config = encryption.encrypt_dict(config_data, sensitive_fields)
        
        # Add metadata
        encrypted_config['updated_at'] = datetime.utcnow().isoformat()
        encrypted_config['updated_by'] = current_user.username
        encrypted_config['encrypted'] = True
        
        # Store in database (upsert)
        await db.ad_configuration.update_one(
            {'_id': 'ad_config'},  # Single document for AD config
            {'$set': encrypted_config},
            upsert=True
        )
        
        # Reload AD authenticator with new config
        ad_authenticator.reload_from_database(db)
        
        logger.info(f"AD configuration saved (encrypted) by {current_user.username}")
        
        return {
            'success': True,
            'message': 'AD configuration saved successfully (encrypted)',
            'config': {
                'enabled': config_request.enabled,
                'server': '***encrypted***',
                'port': config_request.port,
                'domain': '***encrypted***',
                'use_ssl': config_request.use_ssl
            }
        }
        
    except Exception as e:
        logger.error(f"Error saving AD config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/encrypted")
async def get_encrypted_config(current_user: User = Depends(require_admin)):
    """
    Get decrypted AD configuration for editing
    Admin only - returns actual values (decrypted)
    """
    try:
        from server import db
        
        # Get from database
        config_doc = await db.ad_configuration.find_one({'_id': 'ad_config'})
        
        if not config_doc:
            return {
                'success': False,
                'message': 'No AD configuration found',
                'config': None
            }
        
        # Get encryption instance
        encryption = get_encryption()
        
        # Fields to decrypt
        sensitive_fields = ['server', 'domain', 'base_dn', 'bind_user', 'bind_password']
        
        # Decrypt
        decrypted_config = encryption.decrypt_dict(config_doc, sensitive_fields)
        
        # Remove MongoDB _id
        if '_id' in decrypted_config:
            del decrypted_config['_id']
        
        return {
            'success': True,
            'config': decrypted_config
        }
        
    except Exception as e:
        logger.error(f"Error getting encrypted config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
