#!/usr/bin/env python3
"""
Manually process GSP response file to test the workflow
"""

import asyncio
import sys
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Add backend to path
sys.path.append('/app/backend')

from xml_processor import ArgusXMLProcessor
from file_watcher import ArgusResponseHandler

async def process_gsp_file():
    """Manually process the GSP response file"""
    
    # MongoDB connection
    mongo_client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = mongo_client["test_database"]
    
    # Initialize XML processor
    xml_processor = ArgusXMLProcessor(
        "/tmp/argus_inbox",
        "/tmp/argus_outbox", 
        "/tmp/argus_data"
    )
    
    # Find GSP response file
    outbox_path = Path("/tmp/argus_outbox")
    gsp_files = list(outbox_path.glob("GSP-*-R.xml"))
    
    if not gsp_files:
        print("❌ No GSP response files found")
        return False
    
    # Get the most recent file
    gsp_file = max(gsp_files, key=os.path.getmtime)
    print(f"📁 Processing GSP file: {gsp_file.name}")
    
    # Create handler and process file
    handler = ArgusResponseHandler(xml_processor, db)
    
    try:
        await handler._process_response(gsp_file)
        print("✅ GSP file processed successfully")
        
        # Check if data was stored
        gsp_data = await db.system_parameters.find_one(
            {"parameter_type": "GSP"},
            sort=[("timestamp", -1)]
        )
        
        if gsp_data:
            signal_paths = gsp_data.get("signal_paths", [])
            stations = gsp_data.get("stations", [])
            print(f"✅ GSP data stored: {len(stations)} stations, {len(signal_paths)} signal paths")
            
            # Print some details
            for station in stations:
                print(f"   Station: {station.get('name')} ({station.get('type')})")
            
            for path in signal_paths[:3]:  # Show first 3 paths
                print(f"   Signal Path: {path.get('name')} at {path.get('station')} ({path.get('freq_min')}-{path.get('freq_max')} Hz)")
                
            return True
        else:
            print("❌ No GSP data found in database")
            return False
            
    except Exception as e:
        print(f"❌ Error processing GSP file: {e}")
        return False
    finally:
        mongo_client.close()

if __name__ == "__main__":
    result = asyncio.run(process_gsp_file())
    sys.exit(0 if result else 1)