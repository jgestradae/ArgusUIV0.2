"""
Reports API Module
REST API endpoints for report generation, management, and export
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import os
import asyncio

from report_models import (
    ReportCreationRequest, ReportMetadata, ReportContent,
    ReportFilterParams, ReportExportResult
)
from report_generator import ReportGenerator
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Will be set by main server during initialization
db = None
report_generator = None

def set_dependencies(database, generator=None):
    """Set database and report generator dependencies"""
    global db, report_generator
    db = database
    if generator:
        report_generator = generator
    else:
        report_generator = ReportGenerator()


@router.post("/reports/create")
async def create_report(
    request: ReportCreationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create a new report - generation happens in background"""
    try:
        report_meta = ReportMetadata(
            report_type=request.report_type,
            report_name=request.report_name,
            description=request.description,
            created_by=current_user.username if hasattr(current_user, 'username') else str(current_user.get("username", "unknown")),
            filters=request.filters.dict(),
            status="generating"
        )
        
        await db.reports.insert_one(report_meta.dict())
        
        background_tasks.add_task(generate_report_async, report_meta.id, request)
        
        logger.info(f"Report creation initiated: {report_meta.id}")
        
        return {
            "success": True,
            "message": "Report generation started",
            "report_id": report_meta.id,
            "status": "generating"
        }
    except Exception as e:
        logger.error(f"Error creating report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


async def generate_report_async(report_id: str, request: ReportCreationRequest):
    """Background task to generate report"""
    try:
        report_content = await build_report_content(report_id, request)
        
        export_formats = []
        file_paths = []
        
        formats = [request.export_format] if request.export_format else ["PDF"]
        
        for format_type in formats:
            try:
                if format_type == "PDF":
                    filepath = report_generator.generate_pdf(report_content)
                elif format_type == "CSV":
                    filepath = report_generator.generate_csv(report_content)
                elif format_type == "EXCEL":
                    filepath = report_generator.generate_excel(report_content)
                elif format_type == "DOCX":
                    filepath = report_generator.generate_docx(report_content)
                elif format_type == "XML":
                    filepath = report_generator.generate_xml(report_content)
                else:
                    continue
                
                export_formats.append(format_type)
                file_paths.append(filepath)
            except Exception as e:
                logger.error(f"Error generating {format_type}: {e}")
        
        update_data = {
            "status": "completed",
            "export_formats": export_formats,
            "file_path": file_paths[0] if file_paths else None,
            "file_size": os.path.getsize(file_paths[0]) if file_paths else 0
        }
        
        await db.reports.update_one({"id": report_id}, {"$set": update_data})
        logger.info(f"Report completed: {report_id}")
    except Exception as e:
        logger.error(f"Error in report generation: {e}", exc_info=True)
        await db.reports.update_one(
            {"id": report_id},
            {"$set": {"status": "failed", "error_message": str(e)}}
        )


async def build_report_content(report_id: str, request: ReportCreationRequest) -> ReportContent:
    """Build report content based on type and filters"""
    report_meta_doc = await db.reports.find_one({"id": report_id})
    report_meta = ReportMetadata(**report_meta_doc)
    
    report_content = ReportContent(
        metadata=report_meta,
        summary={},
        data=[],
        charts=[],
        statistics={}
    )
    
    filters = request.filters
    query = {}
    if filters.start_date:
        query["created_at"] = {"$gte": filters.start_date}
    if filters.end_date:
        query.setdefault("created_at", {})["$lte"] = filters.end_date
    
    if request.report_type == "measurement_results":
        return await build_measurement_report(report_content, query, filters)
    elif request.report_type == "station_status":
        return await build_station_status_report(report_content, query, filters)
    elif request.report_type == "system_performance":
        return await build_system_performance_report(report_content, query, filters)
    
    return report_content


async def build_measurement_report(content, query, filters):
    """Build measurement results report"""
    cursor = db.measurement_results.find(query).sort("measurement_start", -1).limit(1000)
    measurements = await cursor.to_list(length=1000)
    
    for m in measurements:
        content.data.append({
            "Measurement ID": m.get("order_id", "N/A"),
            "Station": m.get("station_name", "N/A"),
            "Type": m.get("measurement_type", "N/A"),
            "Frequency (MHz)": f"{m.get('frequency_single', 0)/1e6:.3f}" if m.get('frequency_single') else "N/A",
            "Timestamp": str(m.get("measurement_start", "N/A")),
            "Status": m.get("status", "N/A")
        })
    
    content.statistics = {
        "Total Measurements": len(measurements),
        "Stations": len(set(m.get("station_name") for m in measurements if m.get("station_name")))
    }
    
    content.summary = {
        "Total Measurements": len(measurements)
    }
    
    return content


async def build_station_status_report(content, query, filters):
    """Build station status report"""
    system_state = await db.system_states.find_one(sort=[("timestamp", -1)])
    
    if system_state and "stations" in system_state:
        for station in system_state["stations"]:
            content.data.append({
                "Station ID": station.get("station_id", "N/A"),
                "Station Name": station.get("station_name", "N/A"),
                "Status": station.get("status", "unknown"),
                "Online": "Yes" if station.get("is_running") else "No"
            })
    
    total_stations = len(content.data)
    online_stations = sum(1 for s in content.data if s.get("Online") == "Yes")
    
    content.statistics = {
        "Total Stations": total_stations,
        "Online": online_stations,
        "Offline": total_stations - online_stations
    }
    
    return content


async def build_system_performance_report(content, query, filters):
    """Build system performance report"""
    cursor = db.measurement_results.find(query)
    measurements = await cursor.to_list(length=None)
    
    total = len(measurements)
    successful = sum(1 for m in measurements if m.get("status") == "completed")
    
    content.statistics = {
        "Total Measurements": total,
        "Successful": successful,
        "Failed": total - successful,
        "Success Rate": f"{(successful/total*100):.1f}%" if total > 0 else "N/A"
    }
    
    return content


@router.get("/reports/list")
async def list_reports(
    limit: int = 50,
    skip: int = 0,
    report_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all reports"""
    try:
        query = {}
        if report_type:
            query["report_type"] = report_type
        
        total = await db.reports.count_documents(query)
        cursor = db.reports.find(query).sort("created_at", -1).skip(skip).limit(limit)
        reports = await cursor.to_list(length=limit)
        
        for report in reports:
            if "_id" in report:
                report["_id"] = str(report["_id"])
        
        return {
            "success": True,
            "total": total,
            "count": len(reports),
            "reports": reports
        }
    except Exception as e:
        logger.error(f"Error listing reports: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_id}")
async def get_report(report_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific report"""
    try:
        report = await db.reports.find_one({"id": report_id})
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        if "_id" in report:
            report["_id"] = str(report["_id"])
        
        return {"success": True, "report": report}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_id}/download")
async def download_report(
    report_id: str,
    format: str = "PDF",
    current_user: dict = Depends(get_current_user)
):
    """Download report file"""
    try:
        report = await db.reports.find_one({"id": report_id})
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        if report.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Report not ready")
        
        file_path = report.get("file_path")
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Report file not found")
        
        if format.upper() != "PDF":
            base_dir = os.path.dirname(os.path.dirname(file_path))
            format_dir = os.path.join(base_dir, format.lower())
            filename = os.path.basename(file_path).replace(".pdf", f".{format.lower()}")
            if format.upper() == "EXCEL":
                filename = filename.replace(f".{format.lower()}", ".xlsx")
            file_path = os.path.join(format_dir, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"{format} not available")
        
        return FileResponse(
            file_path,
            media_type="application/octet-stream",
            filename=os.path.basename(file_path)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reports/{report_id}")
async def delete_report(report_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a report"""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        
        report = await db.reports.find_one({"id": report_id})
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        if report.get("file_path") and os.path.exists(report.get("file_path")):
            os.remove(report.get("file_path"))
        
        await db.reports.delete_one({"id": report_id})
        
        return {"success": True, "message": f"Report {report_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
