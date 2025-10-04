from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from models import User, UserRole
import os

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

class AuthManager:
    def __init__(self, db):
        self.db = db
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        # Limit password to 72 bytes for bcrypt compatibility
        if len(password.encode('utf-8')) > 72:
            password = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
        return pwd_context.hash(password)
    
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
        """Authenticate user with username and password"""
        user_doc = await self.db.users.find_one({"username": username, "is_active": True})
        if not user_doc:
            return None
        
        user = User(**user_doc)
        if not self.verify_password(password, user_doc["password_hash"]):
            return None
        
        # Update last login
        await self.db.users.update_one(
            {"id": user.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
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
        admin_exists = await self.db.users.find_one({"role": UserRole.ADMIN})
        if not admin_exists:
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
