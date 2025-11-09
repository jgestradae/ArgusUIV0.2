from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hashlib
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from models import User, UserRole
import os
import asyncio

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

class AuthManager:
    def __init__(self, db):
        self.db = db
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        # Simple SHA-256 hash for development/demo purposes
        return self.get_password_hash(plain_password) == hashed_password
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        # Simple SHA-256 hash for development/demo purposes
        return hashlib.sha256(password.encode()).hexdigest()
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """
        Authenticate user with username and password
        Tries AD authentication first (if enabled), then falls back to local
        """
        # Try Active Directory authentication first
        try:
            from auth_ad import ad_authenticator
            
            if ad_authenticator.enabled:
                ad_result = ad_authenticator.authenticate(username, password)
                
                if ad_result['success']:
                    # AD authentication successful
                    user_info = ad_result['user_info']
                    
                    # Check if user exists in local database
                    user_doc = await self.db.users.find_one({"username": username})
                    
                    if user_doc:
                        # Update existing user
                        user = User(**user_doc)
                        await self.db.users.update_one(
                            {"id": user.id},
                            {"$set": {
                                "last_login": datetime.utcnow(),
                                "auth_provider": "ad",
                                "email": user_info.get('email') or user.email
                            }}
                        )
                    else:
                        # Create new user from AD
                        from models import AuthProvider
                        user = User(
                            username=username,
                            email=user_info.get('email'),
                            role=UserRole.OPERATOR,  # Default role for AD users
                            auth_provider=AuthProvider.ACTIVE_DIRECTORY,
                            is_active=True
                        )
                        await self.db.users.insert_one(user.dict())
                    
                    # Log successful AD login
                    try:
                        from system_logger import SystemLogger
                        await SystemLogger.info(
                            SystemLogger.AUTH,
                            f"Successful AD login: {username}",
                            user_id=user.id,
                            details={"username": username, "auth_provider": "ad"}
                        )
                    except:
                        pass
                    
                    return user
        except Exception as e:
            # AD authentication error, fall back to local
            import logging
            logging.warning(f"AD authentication failed, falling back to local: {str(e)}")
        
        # Fallback to local authentication
        user_doc = await self.db.users.find_one({"username": username, "is_active": True})
        if not user_doc:
            # Log failed login attempt - user not found
            try:
                from system_logger import SystemLogger
                await SystemLogger.warning(
                    SystemLogger.AUTH,
                    f"Failed login attempt: User '{username}' not found",
                    details={"username": username, "reason": "user_not_found"}
                )
            except:
                pass
            return None
        
        user = User(**user_doc)
        
        # Check if user has password_hash (local auth)
        if "password_hash" not in user_doc:
            # User exists but has no local password (AD-only user)
            try:
                from system_logger import SystemLogger
                await SystemLogger.warning(
                    SystemLogger.AUTH,
                    f"Failed login attempt: User '{username}' is AD-only, no local password",
                    user_id=user.id,
                    details={"username": username, "reason": "ad_only_user"}
                )
            except:
                pass
            return None
        
        if not self.verify_password(password, user_doc["password_hash"]):
            # Log failed login attempt - incorrect password
            try:
                from system_logger import SystemLogger
                await SystemLogger.warning(
                    SystemLogger.AUTH,
                    f"Failed login attempt: Incorrect password for user '{username}'",
                    user_id=user.id,
                    details={"username": username, "reason": "incorrect_password"}
                )
            except:
                pass
            return None
        
        # Update last login
        await self.db.users.update_one(
            {"id": user.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Log successful login
        try:
            from system_logger import SystemLogger
            await SystemLogger.info(
                SystemLogger.AUTH,
                f"User '{username}' logged in successfully",
                user_id=user.id,
                details={"username": username, "role": user.role}
            )
        except:
            pass
        
        return user
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
        """Get current user from JWT token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
        
        user_doc = await self.db.users.find_one({"username": username, "is_active": True})
        if user_doc is None:
            raise credentials_exception
        
        return User(**user_doc)
    
    async def require_admin(self, current_user: User = Depends(get_current_user)) -> User:
        """Require admin role"""
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return current_user
    
    async def create_default_admin(self):
        """Create default admin user if none exists"""
        # Delete existing admin users first (for development)
        await self.db.users.delete_many({"username": "admin"})
        
        admin_user = {
            "id": "admin-001",
            "username": "admin",
            "password_hash": self.get_password_hash("admin123"),
            "role": UserRole.ADMIN,
            "auth_provider": "local",
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        await self.db.users.insert_one(admin_user)
        print("Default admin user created (username: admin, password: admin123)")

# Global auth manager instance (will be initialized in main app)
auth_manager: Optional[AuthManager] = None

def get_auth_manager() -> AuthManager:
    """Get the auth manager instance"""
    if auth_manager is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication not initialized"
        )
    return auth_manager

# Dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return await get_auth_manager().get_current_user(credentials)

async def require_admin(current_user: User = Depends(get_current_user)):
    return await get_auth_manager().require_admin(current_user)
