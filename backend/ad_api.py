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
