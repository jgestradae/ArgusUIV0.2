from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth import get_current_user, require_admin
from models import User
from amm_models import (
    AMMConfiguration, AMMConfigurationCreate, AMMConfigurationUpdate,
    TimingDefinition, MeasurementDefinition, RangeDefinition, GeneralDefinition,
    AMMExecution, AMMExecutionSummary, AMMDashboardStats, AMMStatus
)
from amm_scheduler import AMMScheduler
import uuid
import logging

logger = logging.getLogger(__name__)

class AMMService:
    def __init__(self, db: AsyncIOMotorDatabase, scheduler: AMMScheduler):
        self.db = db
        self.scheduler = scheduler
        
    async def get_dashboard_stats(self) -> AMMDashboardStats:
        """Get dashboard statistics for AMM overview"""
        try:
            # Get basic counts
            total_amm_configs = await self.db.amm_configurations.count_documents({})
            active_amm_configs = await self.db.amm_configurations.count_documents({"status": AMMStatus.ACTIVE})
            
            # Get running executions
            running_executions = await self.db.amm_executions.count_documents({"status": "running"})
            
            # Get executions in last 24 hours
            yesterday = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            executions_last_24h = await self.db.amm_executions.count_documents({
                "started_at": {"$gte": yesterday}
            })
            
            # Calculate success rate
            total_executions_24h = executions_last_24h
            failed_executions_24h = await self.db.amm_executions.count_documents({
                "started_at": {"$gte": yesterday},
                "status": "failed"
            })
            
            success_rate_24h = 100.0
            if total_executions_24h > 0:
                success_rate_24h = ((total_executions_24h - failed_executions_24h) / total_executions_24h) * 100
            
            # Count alarms (placeholder - would need alarm tracking)
            alarms_last_24h = 0
            
            return AMMDashboardStats(
                total_amm_configs=total_amm_configs,
                active_amm_configs=active_amm_configs,
                running_executions=running_executions,
                executions_last_24h=executions_last_24h,
                alarms_last_24h=alarms_last_24h,
                success_rate_24h=round(success_rate_24h, 1)
            )
            
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {e}")
            # Return default stats on error
            return AMMDashboardStats(
                total_amm_configs=0,
                active_amm_configs=0,
                running_executions=0,
                executions_last_24h=0,
                alarms_last_24h=0,
                success_rate_24h=0.0
            )
    
    async def create_amm_configuration(self, config_data: AMMConfigurationCreate, created_by: str) -> AMMConfiguration:
        """Create a new AMM configuration"""
        
        # Create timing definition
        timing_def = config_data.timing_definition
        timing_def.created_by = created_by
        await self.db.timing_definitions.insert_one(timing_def.dict())
        
        # Create measurement definition
        measurement_def = config_data.measurement_definition
        measurement_def.created_by = created_by
        await self.db.measurement_definitions.insert_one(measurement_def.dict())
        
        # Create range definition
        range_def = config_data.range_definition
        range_def.created_by = created_by
        await self.db.range_definitions.insert_one(range_def.dict())
        
        # Create general definition
        general_def = config_data.general_definition
        general_def.created_by = created_by
        await self.db.general_definitions.insert_one(general_def.dict())
        
        # Create AMM configuration
        amm_config = AMMConfiguration(
            name=config_data.name,
            description=config_data.description,
            timing_definition_id=timing_def.id,
            measurement_definition_id=measurement_def.id,
            range_definition_id=range_def.id,
            general_definition_id=general_def.id,
            created_by=created_by
        )
        
        await self.db.amm_configurations.insert_one(amm_config.dict())
        
        return amm_config
    
    async def get_amm_configurations(self, limit: int = 50) -> List[AMMConfiguration]:
        """Get AMM configurations"""
        configs = await self.db.amm_configurations.find().sort("created_at", -1).limit(limit).to_list(limit)
        return [AMMConfiguration(**config) for config in configs]
    
    async def get_amm_configuration(self, config_id: str) -> Optional[AMMConfiguration]:
        """Get specific AMM configuration"""
        config_data = await self.db.amm_configurations.find_one({"id": config_id})
        if config_data:
            return AMMConfiguration(**config_data)
        return None
    
    async def update_amm_configuration(self, config_id: str, update_data: AMMConfigurationUpdate) -> bool:
        """Update AMM configuration"""
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_dict:
            return True
            
        update_dict["modified_at"] = datetime.utcnow()
        
        result = await self.db.amm_configurations.update_one(
            {"id": config_id},
            {"$set": update_dict}
        )
        
        return result.modified_count > 0
    
    async def delete_amm_configuration(self, config_id: str) -> bool:
        """Delete AMM configuration and related definitions"""
        # Get the configuration first
        config = await self.get_amm_configuration(config_id)
        if not config:
            return False
        
        # Delete related definitions
        await self.db.timing_definitions.delete_one({"id": config.timing_definition_id})
        await self.db.measurement_definitions.delete_one({"id": config.measurement_definition_id})
        await self.db.range_definitions.delete_one({"id": config.range_definition_id})
        await self.db.general_definitions.delete_one({"id": config.general_definition_id})
        
        # Delete the configuration
        result = await self.db.amm_configurations.delete_one({"id": config_id})
        
        return result.deleted_count > 0
    
    async def start_amm_configuration(self, config_id: str) -> bool:
        """Start (activate) an AMM configuration"""
        result = await self.db.amm_configurations.update_one(
            {"id": config_id},
            {"$set": {"status": AMMStatus.ACTIVE, "modified_at": datetime.utcnow()}}
        )
        
        return result.modified_count > 0
    
    async def stop_amm_configuration(self, config_id: str) -> bool:
        """Stop (deactivate) an AMM configuration"""
        result = await self.db.amm_configurations.update_one(
            {"id": config_id},
            {"$set": {"status": AMMStatus.STOPPED, "modified_at": datetime.utcnow()}}
        )
        
        return result.modified_count > 0
    
    async def get_amm_executions(self, amm_config_id: Optional[str] = None, limit: int = 50) -> List[AMMExecution]:
        """Get AMM execution history"""
        query = {}
        if amm_config_id:
            query["amm_config_id"] = amm_config_id
            
        executions = await self.db.amm_executions.find(query).sort("started_at", -1).limit(limit).to_list(limit)
        return [AMMExecution(**execution) for execution in executions]

def create_amm_router(db: AsyncIOMotorDatabase, scheduler: AMMScheduler) -> APIRouter:
    router = APIRouter(tags=["Automatic Mode"])
    service = AMMService(db, scheduler)
    
    @router.get("/api/amm/dashboard-stats", response_model=AMMDashboardStats)
    async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
        """Get AMM dashboard statistics"""
        return await service.get_dashboard_stats()
    
    @router.get("/api/amm/configurations", response_model=List[AMMConfiguration])
    async def get_amm_configurations(
        limit: int = Query(50, ge=1, le=200),
        current_user: User = Depends(get_current_user)
    ):
        """Get AMM configurations"""
        return await service.get_amm_configurations(limit)
    
    @router.post("/api/amm/configurations", response_model=AMMConfiguration)
    async def create_amm_configuration(
        config_data: AMMConfigurationCreate,
        current_user: User = Depends(get_current_user)
    ):
        """Create new AMM configuration and immediately generate XML order"""
        # Create the configuration
        config = await service.create_amm_configuration(config_data, current_user.id)
        
        # Immediately generate and send XML order to inbox
        try:
            await scheduler._execute_amm(config)
            logger.info(f"AMM XML generated immediately for config: {config.id}")
        except Exception as e:
            logger.error(f"Error generating immediate AMM XML: {e}")
            # Don't fail the creation, just log the error
        
        return config
    
    @router.get("/api/amm/configurations/{config_id}", response_model=AMMConfiguration)
    async def get_amm_configuration(
        config_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Get specific AMM configuration"""
        config = await service.get_amm_configuration(config_id)
        if not config:
            raise HTTPException(status_code=404, detail="AMM configuration not found")
        return config
    
    @router.put("/api/amm/configurations/{config_id}")
    async def update_amm_configuration(
        config_id: str,
        update_data: AMMConfigurationUpdate,
        current_user: User = Depends(get_current_user)
    ):
        """Update AMM configuration"""
        success = await service.update_amm_configuration(config_id, update_data)
        if not success:
            raise HTTPException(status_code=404, detail="AMM configuration not found")
        return {"success": True, "message": "Configuration updated"}
    
    @router.delete("/api/amm/configurations/{config_id}")
    async def delete_amm_configuration(
        config_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Delete AMM configuration"""
        success = await service.delete_amm_configuration(config_id)
        if not success:
            raise HTTPException(status_code=404, detail="AMM configuration not found")
        return {"success": True, "message": "Configuration deleted"}
    
    @router.post("/api/amm/configurations/{config_id}/start")
    async def start_amm_configuration(
        config_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Start (activate) AMM configuration"""
        success = await service.start_amm_configuration(config_id)
        if not success:
            raise HTTPException(status_code=404, detail="AMM configuration not found")
        return {"success": True, "message": "AMM configuration started"}
    
    @router.post("/api/amm/configurations/{config_id}/stop")
    async def stop_amm_configuration(
        config_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Stop (deactivate) AMM configuration"""
        success = await service.stop_amm_configuration(config_id)
        if not success:
            raise HTTPException(status_code=404, detail="AMM configuration not found")
        return {"success": True, "message": "AMM configuration stopped"}
    
    @router.get("/api/amm/executions", response_model=List[AMMExecution])
    async def get_amm_executions(
        amm_config_id: Optional[str] = Query(None),
        limit: int = Query(50, ge=1, le=200),
        current_user: User = Depends(get_current_user)
    ):
        """Get AMM execution history"""
        return await service.get_amm_executions(amm_config_id, limit)
    
    @router.post("/api/amm/scheduler/start")
    async def start_scheduler(admin_user: User = Depends(require_admin)):
        """Start the AMM scheduler (admin only)"""
        await scheduler.start_scheduler()
        return {"success": True, "message": "AMM scheduler started"}
    
    @router.post("/api/amm/scheduler/stop")
    async def stop_scheduler(admin_user: User = Depends(require_admin)):
        """Stop the AMM scheduler (admin only)"""
        await scheduler.stop_scheduler()
        return {"success": True, "message": "AMM scheduler stopped"}
    
    @router.post("/api/amm/configurations/{config_id}/execute-now")
    async def execute_amm_now(
        config_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Manually trigger immediate execution of an AMM configuration (for testing)"""
        config_data = await db.amm_configurations.find_one({"id": config_id})
        if not config_data:
            raise HTTPException(status_code=404, detail="AMM configuration not found")
        
        config = AMMConfiguration(**config_data)
        
        try:
            # Execute immediately regardless of schedule
            await scheduler._execute_amm(config)
            return {
                "success": True, 
                "message": f"AMM '{config.name}' execution triggered. Check inbox folder for generated XML."
            }
        except Exception as e:
            logger.error(f"Error manually executing AMM: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to execute AMM: {str(e)}"
            )
    

    @router.get("/measurement-definitions/{definition_id}")
    async def get_measurement_definition(
        definition_id: str,
        db: AsyncIOMotorDatabase = Depends(lambda: db),
        current_user: User = Depends(get_current_user)
    ):
        """Get a specific measurement definition by ID"""
        # Query by 'id' field, not '_id'
        definition = await db.measurement_definitions.find_one({"id": definition_id})
        if not definition:
            raise HTTPException(status_code=404, detail=f"Measurement definition not found: {definition_id}")
        
        # Remove MongoDB _id
        if '_id' in definition:
            del definition['_id']
        
        return definition

    @router.get("/range-definitions/{definition_id}")
    async def get_range_definition(
        definition_id: str,
        db: AsyncIOMotorDatabase = Depends(lambda: db),
        current_user: User = Depends(get_current_user)
    ):
        """Get a specific range definition by ID"""
        # Query by 'id' field, not '_id'
        definition = await db.range_definitions.find_one({"id": definition_id})
        if not definition:
            raise HTTPException(status_code=404, detail=f"Range definition not found: {definition_id}")
        
        # Remove MongoDB _id
        if '_id' in definition:
            del definition['_id']
        
        return definition

    return router