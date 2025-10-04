from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth import get_current_user
from models import User
from data_models import (
    DataItem, DataType, DataItemCreate, DataItemFilter, 
    DataNavigatorResponse, DataStatistics,
    MeasurementResult, MeasurementGraph, AudioRecording,
    MeasurementRegistry, UserLog, AutomaticDefinition
)
import os
from pathlib import Path

class DataNavigatorService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        
        # Collection names for each data type
        self.collections = {
            DataType.MEASUREMENT_RESULT: "measurement_results",
            DataType.GRAPH: "measurement_graphs", 
            DataType.AUDIO: "audio_recordings",
            DataType.REGISTRY: "measurement_registry",
            DataType.USER_LOG: "user_logs",
            DataType.AUTOMATIC_DEFINITION: "automatic_definitions"
        }
    
    async def get_items_by_type(self, data_type: DataType, page: int = 1, 
                               page_size: int = 50, filters: DataItemFilter = None) -> DataNavigatorResponse:
        """Get paginated items by data type with optional filters"""
        collection_name = self.collections[data_type]
        collection = self.db[collection_name]
        
        # Build query from filters
        query = {"type": data_type.value}
        
        if filters:
            if filters.name_search:
                query["name"] = {"$regex": filters.name_search, "$options": "i"}
            if filters.created_after:
                query.setdefault("created_at", {})["$gte"] = filters.created_after
            if filters.created_before:
                query.setdefault("created_at", {})["$lte"] = filters.created_before
            if filters.tags:
                query["tags"] = {"$in": filters.tags}
            if filters.created_by:
                query["created_by"] = filters.created_by
        
        # Get total count
        total_count = await collection.count_documents(query)
        
        # Get paginated items
        skip = (page - 1) * page_size
        cursor = collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        items = await cursor.to_list(length=page_size)
        
        # Convert to DataItem objects
        data_items = []
        for item in items:
            # Create appropriate model based on type
            if data_type == DataType.MEASUREMENT_RESULT:
                data_items.append(MeasurementResult(**item))
            elif data_type == DataType.GRAPH:
                data_items.append(MeasurementGraph(**item))
            elif data_type == DataType.AUDIO:
                data_items.append(AudioRecording(**item))
            elif data_type == DataType.REGISTRY:
                data_items.append(MeasurementRegistry(**item))
            elif data_type == DataType.USER_LOG:
                data_items.append(UserLog(**item))
            elif data_type == DataType.AUTOMATIC_DEFINITION:
                data_items.append(AutomaticDefinition(**item))
            else:
                data_items.append(DataItem(**item))
        
        return DataNavigatorResponse(
            items=data_items,
            total_count=total_count,
            page=page,
            page_size=page_size,
            filters_applied=filters.dict() if filters else {}
        )
    
    async def get_statistics(self) -> List[DataStatistics]:
        """Get statistics for all data types"""
        statistics = []
        
        for data_type in DataType:
            collection_name = self.collections[data_type]
            collection = self.db[collection_name]
            
            # Count documents
            count = await collection.count_documents({"type": data_type.value})
            
            # Calculate total size
            pipeline = [
                {"$match": {"type": data_type.value}},
                {"$group": {
                    "_id": None,
                    "total_size": {"$sum": "$file_size"},
                    "latest": {"$max": "$created_at"},
                    "oldest": {"$min": "$created_at"}
                }}
            ]
            
            result = await collection.aggregate(pipeline).to_list(1)
            total_size = result[0]["total_size"] if result and result[0]["total_size"] else 0
            latest_item = result[0]["latest"] if result else None
            oldest_item = result[0]["oldest"] if result else None
            
            statistics.append(DataStatistics(
                type=data_type,
                count=count,
                total_size=total_size,
                latest_item=latest_item,
                oldest_item=oldest_item
            ))
        
        return statistics
    
    async def create_item(self, item_data: DataItemCreate, created_by: str) -> DataItem:
        """Create a new data item"""
        collection_name = self.collections[item_data.type]
        collection = self.db[collection_name]
        
        # Get file size if file exists
        file_size = None
        if os.path.exists(item_data.file_path):
            file_size = os.path.getsize(item_data.file_path)
        
        # Create appropriate model
        item_dict = item_data.dict()
        item_dict["created_by"] = created_by
        item_dict["file_size"] = file_size
        
        if item_data.type == DataType.MEASUREMENT_RESULT:
            item = MeasurementResult(**item_dict)
        elif item_data.type == DataType.GRAPH:
            item = MeasurementGraph(**item_dict)
        elif item_data.type == DataType.AUDIO:
            item = AudioRecording(**item_dict)
        elif item_data.type == DataType.REGISTRY:
            item = MeasurementRegistry(**item_dict)
        elif item_data.type == DataType.USER_LOG:
            item = UserLog(**item_dict)
        elif item_data.type == DataType.AUTOMATIC_DEFINITION:
            item = AutomaticDefinition(**item_dict)
        else:
            item = DataItem(**item_dict)
        
        await collection.insert_one(item.dict())
        return item
    
    async def get_item_by_id(self, item_id: str, data_type: DataType) -> Optional[DataItem]:
        """Get a specific item by ID and type"""
        collection_name = self.collections[data_type]
        collection = self.db[collection_name]
        
        item_data = await collection.find_one({"id": item_id, "type": data_type.value})
        if not item_data:
            return None
        
        # Create appropriate model
        if data_type == DataType.MEASUREMENT_RESULT:
            return MeasurementResult(**item_data)
        elif data_type == DataType.GRAPH:
            return MeasurementGraph(**item_data)
        elif data_type == DataType.AUDIO:
            return AudioRecording(**item_data)
        elif data_type == DataType.REGISTRY:
            return MeasurementRegistry(**item_data)
        elif data_type == DataType.USER_LOG:
            return UserLog(**item_data)
        elif data_type == DataType.AUTOMATIC_DEFINITION:
            return AutomaticDefinition(**item_data)
        else:
            return DataItem(**item_data)
    
    async def delete_item(self, item_id: str, data_type: DataType) -> bool:
        """Delete an item and optionally its file"""
        # Get item first to get file path
        item = await self.get_item_by_id(item_id, data_type)
        if not item:
            return False
        
        # Delete from database
        collection_name = self.collections[data_type]
        collection = self.db[collection_name]
        result = await collection.delete_one({"id": item_id, "type": data_type.value})
        
        # Optionally delete file (be careful in production)
        # if os.path.exists(item.file_path):
        #     os.remove(item.file_path)
        
        return result.deleted_count > 0
    
    async def create_sample_data(self):
        """Create sample data for development/demo"""
        sample_data = [
            # Measurement Results
            {
                "name": "100MHz_FFM_Scan_Morning",
                "type": DataType.MEASUREMENT_RESULT,
                "description": "Fixed frequency measurement at 100MHz",
                "file_path": "/data/measurements/100mhz_ffm_001.xml",
                "file_format": "xml",
                "measurement_type": "FFM",
                "frequency": 100000000,
                "station_name": "Station_001",
                "measurement_duration": 300,
                "status": "completed",
                "tags": ["morning", "routine", "100mhz"]
            },
            {
                "name": "VHF_Band_Scan_Daily",
                "type": DataType.MEASUREMENT_RESULT,
                "description": "Daily VHF band scan 30-300MHz",
                "file_path": "/data/measurements/vhf_scan_daily_001.xml",
                "file_format": "xml",
                "measurement_type": "SCAN",
                "frequency_range_start": 30000000,
                "frequency_range_end": 300000000,
                "station_name": "Station_002",
                "measurement_duration": 1800,
                "status": "completed",
                "tags": ["daily", "vhf", "scan"]
            },
            # Graphs
            {
                "name": "Spectrum_Plot_100MHz",
                "type": DataType.GRAPH,
                "description": "Spectrum analysis chart for 100MHz measurement",
                "file_path": "/data/graphs/spectrum_100mhz_001.png",
                "file_format": "png",
                "graph_type": "spectrum_plot",
                "width": 1920,
                "height": 1080,
                "tags": ["spectrum", "100mhz", "analysis"]
            },
            # Audio
            {
                "name": "FM_Demod_Audio_100MHz",
                "type": DataType.AUDIO,
                "description": "Demodulated FM audio from 100MHz signal",
                "file_path": "/data/audio/fm_100mhz_001.wav",
                "file_format": "wav",
                "duration": 120.5,
                "sample_rate": 44100,
                "channels": 1,
                "bit_depth": 16,
                "frequency": 100000000,
                "demodulation": "FM",
                "tags": ["fm", "audio", "100mhz"]
            },
            # Registry
            {
                "name": "Daily_Measurement_Log_Today",
                "type": DataType.REGISTRY,
                "description": "Daily registry of all measurements performed",
                "file_path": "/data/registry/daily_log_20251004.json",
                "file_format": "json",
                "registry_type": "daily_log",
                "date": datetime.now(),
                "measurements_count": 47,
                "stations_involved": ["Station_001", "Station_002"],
                "tags": ["daily", "registry", "log"]
            },
            # User Logs
            {
                "name": "Authentication_Log_Today",
                "type": DataType.USER_LOG,
                "description": "User authentication events log",
                "file_path": "/data/logs/auth_20251004.txt",
                "file_format": "txt",
                "log_type": "authentication",
                "date": datetime.now(),
                "entries_count": 125,
                "log_level": "INFO",
                "tags": ["auth", "security", "daily"]
            },
            # Automatic Definitions
            {
                "name": "Hourly_Spectrum_Survey",
                "type": DataType.AUTOMATIC_DEFINITION,
                "description": "Automated hourly spectrum survey configuration",
                "file_path": "/data/auto_configs/hourly_survey.json",
                "file_format": "json",
                "schedule_cron": "0 * * * *",  # Every hour
                "measurement_params": {
                    "frequency_range": ["30MHz", "3GHz"],
                    "measurement_type": "SCAN",
                    "duration": 600
                },
                "is_active": True,
                "execution_count": 245,
                "stations": ["Station_001", "Station_002"],
                "tags": ["automatic", "hourly", "survey"]
            }
        ]
        
        for data in sample_data:
            # Add some file size simulation
            if data["file_format"] == "xml":
                data["file_size"] = 15000 + (hash(data["name"]) % 50000)
            elif data["file_format"] == "png":
                data["file_size"] = 200000 + (hash(data["name"]) % 800000)
            elif data["file_format"] == "wav":
                data["file_size"] = 5000000 + (hash(data["name"]) % 10000000)
            else:
                data["file_size"] = 1000 + (hash(data["name"]) % 10000)
            
            data["created_by"] = "system"
            data["created_at"] = datetime.now() - timedelta(hours=hash(data["name"]) % 72)
            
            # Create appropriate model
            if data["type"] == DataType.MEASUREMENT_RESULT:
                item = MeasurementResult(**data)
            elif data["type"] == DataType.GRAPH:
                item = MeasurementGraph(**data)
            elif data["type"] == DataType.AUDIO:
                item = AudioRecording(**data)
            elif data["type"] == DataType.REGISTRY:
                item = MeasurementRegistry(**data)
            elif data["type"] == DataType.USER_LOG:
                item = UserLog(**data)
            elif data["type"] == DataType.AUTOMATIC_DEFINITION:
                item = AutomaticDefinition(**data)
            
            collection_name = self.collections[data["type"]]
            collection = self.db[collection_name]
            
            # Check if already exists
            existing = await collection.find_one({"name": data["name"]})
            if not existing:
                await collection.insert_one(item.dict())

def create_data_navigator_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["Data Navigator"])
    service = DataNavigatorService(db)
    
    @router.get("/api/data/statistics", response_model=List[DataStatistics])
    async def get_data_statistics(current_user: User = Depends(get_current_user)):
        """Get statistics for all data types"""
        return await service.get_statistics()
    
    @router.get("/api/data/{data_type}", response_model=DataNavigatorResponse)
    async def get_data_by_type(
        data_type: DataType,
        page: int = Query(1, ge=1),
        page_size: int = Query(50, ge=1, le=200),
        name_search: Optional[str] = Query(None),
        created_after: Optional[datetime] = Query(None),
        created_before: Optional[datetime] = Query(None),
        created_by: Optional[str] = Query(None),
        current_user: User = Depends(get_current_user)
    ):
        """Get paginated data items by type with optional filters"""
        filters = DataItemFilter(
            name_search=name_search,
            created_after=created_after,
            created_before=created_before,
            created_by=created_by
        )
        return await service.get_items_by_type(data_type, page, page_size, filters)
    
    @router.get("/api/data/{data_type}/{item_id}")
    async def get_data_item(
        data_type: DataType,
        item_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Get a specific data item by ID"""
        item = await service.get_item_by_id(item_id, data_type)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item
    
    @router.post("/api/data/{data_type}")
    async def create_data_item(
        data_type: DataType,
        item_data: DataItemCreate,
        current_user: User = Depends(get_current_user)
    ):
        """Create a new data item"""
        # Ensure the type matches the URL parameter
        item_data.type = data_type
        return await service.create_item(item_data, current_user.id)
    
    @router.delete("/api/data/{data_type}/{item_id}")
    async def delete_data_item(
        data_type: DataType,
        item_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Delete a data item"""
        success = await service.delete_item(item_id, data_type)
        if not success:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"success": True, "message": "Item deleted successfully"}
    
    @router.post("/api/data/create-sample")
    async def create_sample_data(current_user: User = Depends(get_current_user)):
        """Create sample data for development (admin only)"""
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        await service.create_sample_data()
        return {"success": True, "message": "Sample data created"}
    
    return router
