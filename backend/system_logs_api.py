"""
System Logs API for ArgusUI
Provides endpoints for managing and querying system logs
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from models import SystemLog, User
from auth import get_current_user
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/")
client = AsyncIOMotorClient(MONGO_URL)
db = client.argus_ui

router = APIRouter(prefix="/logs", tags=["System Logs"])

@router.get("", response_model=List[SystemLog])
async def get_system_logs(
    limit: int = Query(100, ge=1, le=1000),
    level: Optional[str] = Query(None, description="Filter by log level (INFO, WARNING, ERROR, DEBUG, CRITICAL)"),
    source: Optional[str] = Query(None, description="Filter by log source"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    order_id: Optional[str] = Query(None, description="Filter by order ID"),
    from_date: Optional[datetime] = Query(None, description="Filter logs from this date"),
    to_date: Optional[datetime] = Query(None, description="Filter logs to this date"),
    search: Optional[str] = Query(None, description="Search in message"),
    current_user: User = Depends(get_current_user)
):
    """
    Get system logs with filtering and pagination
    
    - **limit**: Maximum number of logs to return (1-1000)
    - **level**: Filter by log level
    - **source**: Filter by log source
    - **user_id**: Filter by user ID
    - **order_id**: Filter by order ID
    - **from_date**: Start date for filtering
    - **to_date**: End date for filtering
    - **search**: Search term for message content
    """
    query = {}
    
    # Apply filters
    if level:
        query["level"] = level.upper()
    
    if source:
        query["source"] = source
    
    if user_id:
        query["user_id"] = user_id
    
    if order_id:
        query["order_id"] = order_id
    
    # Date range filter
    if from_date or to_date:
        query["timestamp"] = {}
        if from_date:
            query["timestamp"]["$gte"] = from_date.isoformat()
        if to_date:
            query["timestamp"]["$lte"] = to_date.isoformat()
    
    # Search in message
    if search:
        query["message"] = {"$regex": search, "$options": "i"}
    
    # Get logs from database
    logs = await db.system_logs.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Parse timestamps back to datetime objects
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    
    return [SystemLog(**log) for log in logs]


@router.get("/stats")
async def get_log_stats(
    hours: int = Query(24, ge=1, le=168, description="Number of hours to analyze"),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about system logs
    
    - **hours**: Number of hours to analyze (1-168, default: 24)
    
    Returns counts by level, source, and recent activity
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Get logs since specified time
    logs = await db.system_logs.find({
        "timestamp": {"$gte": since.isoformat()}
    }).to_list(10000)
    
    # Calculate statistics
    total_logs = len(logs)
    
    # Count by level
    levels = {}
    for log in logs:
        level = log.get("level", "UNKNOWN")
        levels[level] = levels.get(level, 0) + 1
    
    # Count by source
    sources = {}
    for log in logs:
        source = log.get("source", "UNKNOWN")
        sources[source] = sources.get(source, 0) + 1
    
    # Get recent errors
    recent_errors = [log for log in logs if log.get("level") in ["ERROR", "CRITICAL"]]
    recent_errors.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    recent_errors = recent_errors[:10]
    
    return {
        "period_hours": hours,
        "since": since.isoformat(),
        "total_logs": total_logs,
        "by_level": levels,
        "by_source": sources,
        "recent_errors_count": len([log for log in logs if log.get("level") in ["ERROR", "CRITICAL"]]),
        "recent_warnings_count": len([log for log in logs if log.get("level") == "WARNING"]),
        "recent_errors": [
            {
                "timestamp": err.get("timestamp"),
                "source": err.get("source"),
                "message": err.get("message"),
                "level": err.get("level")
            }
            for err in recent_errors
        ]
    }


@router.get("/sources")
async def get_log_sources(current_user: User = Depends(get_current_user)):
    """
    Get list of all available log sources
    
    Returns a list of unique log sources in the database
    """
    sources = await db.system_logs.distinct("source")
    return {"sources": sorted(sources)}


@router.get("/levels")
async def get_log_levels(current_user: User = Depends(get_current_user)):
    """
    Get list of all available log levels
    
    Returns a list of unique log levels in the database
    """
    levels = await db.system_logs.distinct("level")
    return {"levels": sorted(levels)}


@router.delete("/{log_id}")
async def delete_log(
    log_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific log entry
    
    Requires authentication
    """
    result = await db.system_logs.delete_one({"id": log_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log entry not found")
    
    return {"success": True, "message": "Log entry deleted"}


@router.delete("")
async def delete_logs(
    level: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    older_than_days: Optional[int] = Query(None, ge=1),
    current_user: User = Depends(get_current_user)
):
    """
    Delete multiple log entries based on filters
    
    - **level**: Delete logs of specific level
    - **source**: Delete logs from specific source
    - **older_than_days**: Delete logs older than N days
    
    Requires authentication
    """
    query = {}
    
    if level:
        query["level"] = level.upper()
    
    if source:
        query["source"] = source
    
    if older_than_days:
        cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
        query["timestamp"] = {"$lt": cutoff_date.isoformat()}
    
    # Require at least one filter
    if not query:
        raise HTTPException(
            status_code=400,
            detail="At least one filter parameter is required"
        )
    
    result = await db.system_logs.delete_many(query)
    
    return {
        "success": True,
        "message": f"Deleted {result.deleted_count} log entries",
        "deleted_count": result.deleted_count
    }


@router.post("/export")
async def export_logs(
    format: str = Query("csv", regex="^(csv|json)$"),
    limit: int = Query(1000, ge=1, le=10000),
    level: Optional[str] = None,
    source: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Export logs in CSV or JSON format
    
    - **format**: Export format (csv or json)
    - **limit**: Maximum number of logs to export
    - **level**: Filter by log level
    - **source**: Filter by log source
    """
    query = {}
    
    if level:
        query["level"] = level.upper()
    
    if source:
        query["source"] = source
    
    logs = await db.system_logs.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Parse timestamps
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    
    if format == "json":
        return {
            "success": True,
            "format": "json",
            "count": len(logs),
            "logs": logs
        }
    else:  # CSV format
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Timestamp', 'Level', 'Source', 'Message', 'User ID', 'Order ID'])
        
        # Write data
        for log in logs:
            writer.writerow([
                log.get('timestamp', ''),
                log.get('level', ''),
                log.get('source', ''),
                log.get('message', ''),
                log.get('user_id', ''),
                log.get('order_id', '')
            ])
        
        return {
            "success": True,
            "format": "csv",
            "count": len(logs),
            "data": output.getvalue()
        }
