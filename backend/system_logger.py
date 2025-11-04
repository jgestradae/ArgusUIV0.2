"""
System Logger Module for ArgusUI
Provides centralized logging functionality for all system events
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models import SystemLog
import uuid

# Setup Python logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/")
client = AsyncIOMotorClient(MONGO_URL)
db = client.argus_ui

class SystemLogger:
    """Centralized system logger for ArgusUI"""
    
    # Log Levels
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    DEBUG = "DEBUG"
    CRITICAL = "CRITICAL"
    
    # Log Sources/Categories
    API = "API"
    XML_PROCESSOR = "XML_PROCESSOR"
    ARGUS = "ARGUS"
    FILE_WATCHER = "FILE_WATCHER"
    AMM_SCHEDULER = "AMM_SCHEDULER"
    AUTH = "AUTH"
    DATABASE = "DATABASE"
    SMDI = "SMDI"
    MEASUREMENT = "MEASUREMENT"
    SYSTEM = "SYSTEM"
    REPORT = "REPORT"
    
    @staticmethod
    async def log(
        level: str,
        source: str,
        message: str,
        user_id: Optional[str] = None,
        order_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Log a system event to MongoDB and console
        
        Args:
            level: Log level (INFO, WARNING, ERROR, DEBUG, CRITICAL)
            source: Source of the log (API, XML_PROCESSOR, ARGUS, etc.)
            message: Log message
            user_id: Optional user ID associated with the event
            order_id: Optional order ID associated with the event
            details: Optional additional details as dictionary
        """
        try:
            # Create log entry
            log_entry = SystemLog(
                id=str(uuid.uuid4()),
                timestamp=datetime.now(timezone.utc),
                level=level,
                source=source,
                message=message,
                user_id=user_id,
                order_id=order_id,
                details=details
            )
            
            # Log to console
            log_msg = f"[{source}] {message}"
            if user_id:
                log_msg += f" | User: {user_id}"
            if order_id:
                log_msg += f" | Order: {order_id}"
            
            if level == SystemLogger.ERROR or level == SystemLogger.CRITICAL:
                logger.error(log_msg)
            elif level == SystemLogger.WARNING:
                logger.warning(log_msg)
            elif level == SystemLogger.DEBUG:
                logger.debug(log_msg)
            else:
                logger.info(log_msg)
            
            # Save to MongoDB
            log_dict = log_entry.dict()
            # Convert datetime to ISO string for MongoDB storage
            if isinstance(log_dict.get('timestamp'), datetime):
                log_dict['timestamp'] = log_dict['timestamp'].isoformat()
            
            await db.system_logs.insert_one(log_dict)
            
        except Exception as e:
            # Fallback to console logging if DB insert fails
            logger.error(f"Failed to log system event: {str(e)}")
            logger.error(f"Original log: [{source}] {message}")
    
    @staticmethod
    async def info(source: str, message: str, user_id: Optional[str] = None, 
                   order_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        """Log INFO level event"""
        await SystemLogger.log(SystemLogger.INFO, source, message, user_id, order_id, details)
    
    @staticmethod
    async def warning(source: str, message: str, user_id: Optional[str] = None,
                     order_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        """Log WARNING level event"""
        await SystemLogger.log(SystemLogger.WARNING, source, message, user_id, order_id, details)
    
    @staticmethod
    async def error(source: str, message: str, user_id: Optional[str] = None,
                   order_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        """Log ERROR level event"""
        await SystemLogger.log(SystemLogger.ERROR, source, message, user_id, order_id, details)
    
    @staticmethod
    async def debug(source: str, message: str, user_id: Optional[str] = None,
                   order_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        """Log DEBUG level event"""
        await SystemLogger.log(SystemLogger.DEBUG, source, message, user_id, order_id, details)
    
    @staticmethod
    async def critical(source: str, message: str, user_id: Optional[str] = None,
                      order_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        """Log CRITICAL level event"""
        await SystemLogger.log(SystemLogger.CRITICAL, source, message, user_id, order_id, details)


# Convenience function for backward compatibility
async def log_system_event(level: str, source: str, message: str, 
                          user_id: Optional[str] = None, order_id: Optional[str] = None,
                          details: Optional[Dict[str, Any]] = None):
    """Helper function to log system events (backward compatibility)"""
    await SystemLogger.log(level, source, message, user_id, order_id, details)
