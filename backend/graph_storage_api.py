"""
Graph Storage API
Save and manage graph snapshots from Data Navigator
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
import uuid
import base64
import logging
from auth import get_current_user
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/saved-graphs", tags=["Saved Graphs"])

# Directory for graph images
GRAPHS_DIR = "/app/reports/pictures"
os.makedirs(GRAPHS_DIR, exist_ok=True)

# ============================================================================
# Models
# ============================================================================

class SavedGraph(BaseModel):
    """Saved graph metadata"""
    id: str = Field(default_factory=lambda: f"graph_{uuid.uuid4().hex[:12]}")
    graph_name: str = Field(..., description="User-provided name for the graph")
    graph_type: str = Field(..., description="Type of graph (level_vs_time, spectrogram, etc)")
    measurement_id: Optional[str] = Field(None, description="Associated measurement ID")
    image_path: str = Field(..., description="Path to PNG file")
    image_url: str = Field(..., description="URL to access the image")
    
    # Measurement metadata
    measurement_date: Optional[str] = None
    measurement_time: Optional[str] = None
    frequency_start: Optional[float] = None
    frequency_end: Optional[float] = None
    center_frequency: Optional[float] = None
    station_name: Optional[str] = None
    
    # Location data (for DF/TDOA measurements)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    coordinates_text: Optional[str] = None
    
    # Graph settings
    threshold: Optional[float] = None
    time_interval: Optional[int] = None
    
    # User and timestamps
    created_by: str = Field(..., description="Username who saved the graph")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    description: Optional[str] = Field(None, description="Optional description")

class SaveGraphRequest(BaseModel):
    """Request to save a graph"""
    graph_name: str
    graph_type: str
    measurement_id: Optional[str] = None
    image_data: str = Field(..., description="Base64 encoded PNG image")
    
    # Metadata
    measurement_date: Optional[str] = None
    measurement_time: Optional[str] = None
    frequency_start: Optional[float] = None
    frequency_end: Optional[float] = None
    center_frequency: Optional[float] = None
    station_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    coordinates_text: Optional[str] = None
    threshold: Optional[float] = None
    time_interval: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    description: Optional[str] = None

class GraphSearchFilters(BaseModel):
    """Search filters for graphs"""
    graph_type: Optional[str] = None
    station_name: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    tags: Optional[List[str]] = None
    created_by: Optional[str] = None

# ============================================================================
# Database initialization
# ============================================================================

db = None

def init_db(database):
    """Initialize database connection"""
    global db
    db = database
    logger.info("Graph Storage API initialized")

# ============================================================================
# Endpoints
# ============================================================================

@router.post("/save")
async def save_graph(
    request: SaveGraphRequest,
    current_user: User = Depends(get_current_user)
):
    """Save a graph snapshot"""
    try:
        # Generate unique ID and filename
        graph_id = f"graph_{uuid.uuid4().hex[:12]}"
        filename = f"{graph_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(GRAPHS_DIR, filename)
        
        # Decode and save image
        image_data = request.image_data
        if image_data.startswith('data:image'):
            # Remove data URL prefix
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        with open(filepath, 'wb') as f:
            f.write(image_bytes)
        
        # Create metadata
        saved_graph = SavedGraph(
            id=graph_id,
            graph_name=request.graph_name,
            graph_type=request.graph_type,
            measurement_id=request.measurement_id,
            image_path=filepath,
            image_url=f"/api/saved-graphs/{graph_id}/image",
            measurement_date=request.measurement_date,
            measurement_time=request.measurement_time,
            frequency_start=request.frequency_start,
            frequency_end=request.frequency_end,
            center_frequency=request.center_frequency,
            station_name=request.station_name,
            latitude=request.latitude,
            longitude=request.longitude,
            coordinates_text=request.coordinates_text,
            threshold=request.threshold,
            time_interval=request.time_interval,
            created_by=current_user.username,
            tags=request.tags,
            description=request.description
        )
        
        # Save to database
        await db.saved_graphs.insert_one(saved_graph.dict())
        
        logger.info(f"Graph saved: {graph_id} by {current_user.username}")
        return {
            "success": True,
            "message": "Graph saved successfully",
            "graph": saved_graph.dict()
        }
    
    except Exception as e:
        logger.error(f"Error saving graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_saved_graphs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """List all saved graphs"""
    try:
        total = await db.saved_graphs.count_documents({})
        graphs = await db.saved_graphs.find().sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "success": True,
            "graphs": graphs,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    except Exception as e:
        logger.error(f"Error listing graphs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_graphs(
    filters: GraphSearchFilters,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Search graphs with filters"""
    try:
        query = {}
        
        if filters.graph_type:
            query["graph_type"] = filters.graph_type
        
        if filters.station_name:
            query["station_name"] = {"$regex": filters.station_name, "$options": "i"}
        
        if filters.date_from or filters.date_to:
            query["measurement_date"] = {}
            if filters.date_from:
                query["measurement_date"]["$gte"] = filters.date_from
            if filters.date_to:
                query["measurement_date"]["$lte"] = filters.date_to
        
        if filters.tags:
            query["tags"] = {"$in": filters.tags}
        
        if filters.created_by:
            query["created_by"] = filters.created_by
        
        total = await db.saved_graphs.count_documents(query)
        graphs = await db.saved_graphs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "success": True,
            "graphs": graphs,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    except Exception as e:
        logger.error(f"Error searching graphs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{graph_id}")
async def get_graph(
    graph_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get graph metadata by ID"""
    try:
        graph = await db.saved_graphs.find_one({"id": graph_id})
        if not graph:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        return {"success": True, "graph": graph}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{graph_id}/image")
async def get_graph_image(graph_id: str):
    """Get the graph image file"""
    try:
        from fastapi.responses import FileResponse
        
        graph = await db.saved_graphs.find_one({"id": graph_id})
        if not graph:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        image_path = graph["image_path"]
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Image file not found")
        
        return FileResponse(image_path, media_type="image/png")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving graph image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{graph_id}")
async def delete_graph(
    graph_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a saved graph"""
    try:
        graph = await db.saved_graphs.find_one({"id": graph_id})
        if not graph:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Check permissions (only creator or admin can delete)
        if graph["created_by"] != current_user.username and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Delete image file
        try:
            if os.path.exists(graph["image_path"]):
                os.remove(graph["image_path"])
        except Exception as e:
            logger.warning(f"Could not delete image file: {e}")
        
        # Delete from database
        await db.saved_graphs.delete_one({"id": graph_id})
        
        logger.info(f"Graph deleted: {graph_id} by {current_user.username}")
        return {"success": True, "message": "Graph deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{graph_id}")
async def update_graph_metadata(
    graph_id: str,
    graph_name: Optional[str] = None,
    tags: Optional[List[str]] = None,
    description: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Update graph metadata"""
    try:
        graph = await db.saved_graphs.find_one({"id": graph_id})
        if not graph:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Build update dict
        update_dict = {}
        if graph_name is not None:
            update_dict["graph_name"] = graph_name
        if tags is not None:
            update_dict["tags"] = tags
        if description is not None:
            update_dict["description"] = description
        
        if update_dict:
            await db.saved_graphs.update_one(
                {"id": graph_id},
                {"$set": update_dict}
            )
        
        logger.info(f"Graph metadata updated: {graph_id} by {current_user.username}")
        return {"success": True, "message": "Graph updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
