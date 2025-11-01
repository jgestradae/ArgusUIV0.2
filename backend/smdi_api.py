"""
SMDI (Spectrum Management Database Interface) API Routes
Handles API endpoints for querying and retrieving Frequency and Transmitter Lists
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
import logging

from smdi_models import (
    SMDIQueryRequest,
    FrequencyListResult,
    TransmitterListResult,
    FrequencyQueryParams,
    LocationQueryParams,
    AdditionalQueryParams
)
from models import OrderType
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Will be set by main server during initialization
xml_processor = None
db = None

def set_dependencies(processor, database):
    """Set XML processor and database dependencies"""
    global xml_processor, db
    xml_processor = processor
    db = database


@router.post("/smdi/query-frequencies")
async def query_frequencies(query: SMDIQueryRequest, current_user: dict = Depends(get_current_user)):
    """
    Trigger SMDI Frequency List query (IFL/IOFL)
    Generates XML request and sends to Argus inbox
    """
    try:
        # Generate unique order ID
        order_id = xml_processor.generate_order_id(prefix="IFL")
        
        # Set query type to IFL
        query.query_type = "IFL"
        
        # Generate XML request
        xml_content = xml_processor.create_smdi_frequency_list_order(
            order_id=order_id,
            query_params=query.dict()
        )
        
        # Determine filename based on result_option
        if query.result_option == "occupied_freq":
            order_type = "IOFL"
        else:
            order_type = "IFL"
        
        # Save XML to inbox
        xml_filename = f"{order_id}-O.xml"
        xml_filepath = xml_processor.inbox_path / xml_filename
        
        with open(xml_filepath, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        
        logger.info(f"SMDI Frequency List query created: {order_id}")
        
        # Store query request in database for later reference
        query_record = {
            "order_id": order_id,
            "order_type": order_type,
            "query_type": "frequency_list",
            "query_name": query.list_name or f"Frequency Query {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "query_params": query.dict(),
            "created_by": current_user.get("username"),
            "created_at": datetime.now(),
            "status": "pending",
            "xml_request_file": str(xml_filepath)
        }
        
        await db.smdi_queries.insert_one(query_record)
        
        return {
            "success": True,
            "message": "Frequency list query sent to Argus",
            "order_id": order_id,
            "order_type": order_type,
            "xml_file": xml_filename
        }
        
    except Exception as e:
        logger.error(f"Error creating frequency list query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/smdi/query-transmitters")
async def query_transmitters(query: SMDIQueryRequest, current_user: dict = Depends(get_current_user)):
    """
    Trigger SMDI Transmitter List query (ITL)
    Generates XML request and sends to Argus inbox
    """
    try:
        # Generate unique order ID
        order_id = xml_processor.generate_order_id(prefix="ITL")
        
        # Set query type to ITL
        query.query_type = "ITL"
        
        # Generate XML request
        xml_content = xml_processor.create_smdi_transmitter_list_order(
            order_id=order_id,
            query_params=query.dict()
        )
        
        # Save XML to inbox
        xml_filename = f"{order_id}-O.xml"
        xml_filepath = xml_processor.inbox_path / xml_filename
        
        with open(xml_filepath, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        
        logger.info(f"SMDI Transmitter List query created: {order_id}")
        
        # Store query request in database for later reference
        query_record = {
            "order_id": order_id,
            "order_type": "ITL",
            "query_type": "transmitter_list",
            "query_name": query.list_name or f"Transmitter Query {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "query_params": query.dict(),
            "created_by": current_user.get("username"),
            "created_at": datetime.now(),
            "status": "pending",
            "xml_request_file": str(xml_filepath)
        }
        
        await db.smdi_queries.insert_one(query_record)
        
        return {
            "success": True,
            "message": "Transmitter list query sent to Argus",
            "order_id": order_id,
            "order_type": "ITL",
            "xml_file": xml_filename
        }
        
    except Exception as e:
        logger.error(f"Error creating transmitter list query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/smdi/frequency-lists")
async def get_frequency_lists(
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all stored frequency lists
    """
    try:
        # Get total count
        total = await db.frequency_lists.count_documents({})
        
        # Get frequency lists with pagination
        cursor = db.frequency_lists.find({}).sort("created_at", -1).skip(skip).limit(limit)
        freq_lists = await cursor.to_list(length=limit)
        
        # Convert _id to string for JSON serialization
        for fl in freq_lists:
            if "_id" in fl:
                fl["_id"] = str(fl["_id"])
        
        return {
            "success": True,
            "total": total,
            "count": len(freq_lists),
            "frequency_lists": freq_lists
        }
        
    except Exception as e:
        logger.error(f"Error retrieving frequency lists: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/smdi/frequency-lists/{order_id}")
async def get_frequency_list(order_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get specific frequency list by order_id
    """
    try:
        freq_list = await db.frequency_lists.find_one({"order_id": order_id})
        
        if not freq_list:
            raise HTTPException(status_code=404, detail="Frequency list not found")
        
        # Convert _id to string
        if "_id" in freq_list:
            freq_list["_id"] = str(freq_list["_id"])
        
        return {
            "success": True,
            "frequency_list": freq_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving frequency list {order_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/smdi/transmitter-lists")
async def get_transmitter_lists(
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all stored transmitter lists
    """
    try:
        # Get total count
        total = await db.transmitter_lists.count_documents({})
        
        # Get transmitter lists with pagination
        cursor = db.transmitter_lists.find({}).sort("created_at", -1).skip(skip).limit(limit)
        tx_lists = await cursor.to_list(length=limit)
        
        # Convert _id to string for JSON serialization
        for tl in tx_lists:
            if "_id" in tl:
                tl["_id"] = str(tl["_id"])
        
        return {
            "success": True,
            "total": total,
            "count": len(tx_lists),
            "transmitter_lists": tx_lists
        }
        
    except Exception as e:
        logger.error(f"Error retrieving transmitter lists: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/smdi/transmitter-lists/{order_id}")
async def get_transmitter_list(order_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get specific transmitter list by order_id
    """
    try:
        tx_list = await db.transmitter_lists.find_one({"order_id": order_id})
        
        if not tx_list:
            raise HTTPException(status_code=404, detail="Transmitter list not found")
        
        # Convert _id to string
        if "_id" in tx_list:
            tx_list["_id"] = str(tx_list["_id"])
        
        return {
            "success": True,
            "transmitter_list": tx_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving transmitter list {order_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/smdi/frequency-lists/{order_id}")
async def delete_frequency_list(order_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a frequency list by order_id
    """
    try:
        result = await db.frequency_lists.delete_one({"order_id": order_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Frequency list not found")
        
        return {
            "success": True,
            "message": f"Frequency list {order_id} deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting frequency list {order_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/smdi/transmitter-lists/{order_id}")
async def delete_transmitter_list(order_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a transmitter list by order_id
    """
    try:
        result = await db.transmitter_lists.delete_one({"order_id": order_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Transmitter list not found")
        
        return {
            "success": True,
            "message": f"Transmitter list {order_id} deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transmitter list {order_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/smdi/queries")
async def get_smdi_queries(
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all SMDI query requests (pending and completed)
    """
    try:
        # Get total count
        total = await db.smdi_queries.count_documents({})
        
        # Get queries with pagination
        cursor = db.smdi_queries.find({}).sort("created_at", -1).skip(skip).limit(limit)
        queries = await cursor.to_list(length=limit)
        
        # Convert _id to string for JSON serialization
        for q in queries:
            if "_id" in q:
                q["_id"] = str(q["_id"])
        
        return {
            "success": True,
            "total": total,
            "count": len(queries),
            "queries": queries
        }
        
    except Exception as e:
        logger.error(f"Error retrieving SMDI queries: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
