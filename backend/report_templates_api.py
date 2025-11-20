"""
Report Templates API
Manages customizable report templates with logos, headers, and content
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import os
import uuid
import logging
from auth import get_current_user
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/report-templates", tags=["Report Templates"])

# Directory for logo storage
LOGOS_DIR = "/app/reports/logos"
os.makedirs(LOGOS_DIR, exist_ok=True)

# ============================================================================
# Models
# ============================================================================

class ReportTemplate(BaseModel):
    """Report template configuration"""
    id: str = Field(default_factory=lambda: f"tmpl_{uuid.uuid4().hex[:12]}")
    template_name: str = Field(..., description="Template name")
    logo_path: Optional[str] = None
    logo_url: Optional[str] = None
    header_title: str = Field(default="Measurement Report", description="Report header title")
    description: str = Field(default="", description="Report description paragraph")
    operator_name: str = Field(default="", description="Operator name for signature")
    organization: str = Field(default="National Spectrum Agency - ANE", description="Organization name")
    include_metadata: bool = Field(default=True, description="Include measurement metadata")
    include_data_table: bool = Field(default=True, description="Include measurement data table")
    data_row_limit: int = Field(default=10000, description="Maximum rows in data table")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    created_by: str = Field(..., description="Username who created template")
    is_active: bool = Field(default=True, description="Whether this template is active")

class TemplateUpdate(BaseModel):
    """Update template fields"""
    template_name: Optional[str] = None
    header_title: Optional[str] = None
    description: Optional[str] = None
    operator_name: Optional[str] = None
    organization: Optional[str] = None
    include_metadata: Optional[bool] = None
    include_data_table: Optional[bool] = None
    data_row_limit: Optional[int] = None

# ============================================================================
# Database initialization
# ============================================================================

db = None

def init_db(database):
    """Initialize database connection"""
    global db
    db = database
    logger.info("Report Templates API initialized")

# ============================================================================
# Endpoints
# ============================================================================

@router.get("/active")
async def get_active_template(current_user: User = Depends(get_current_user)):
    """Get the active report template"""
    try:
        template = await db.report_templates.find_one({"is_active": True})
        
        if not template:
            # Create default template if none exists
            default_template = ReportTemplate(
                template_name="Default Template",
                created_by=current_user.username
            )
            await db.report_templates.insert_one(default_template.dict())
            return {"success": True, "template": default_template.dict()}
        
        return {"success": True, "template": template}
    
    except Exception as e:
        logger.error(f"Error fetching active template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all")
async def get_all_templates(current_user: User = Depends(get_current_user)):
    """Get all report templates"""
    try:
        templates = await db.report_templates.find().to_list(length=100)
        return {"success": True, "templates": templates, "count": len(templates)}
    
    except Exception as e:
        logger.error(f"Error fetching templates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create")
async def create_template(
    template: ReportTemplate,
    current_user: User = Depends(get_current_user)
):
    """Create a new report template"""
    try:
        template.created_by = current_user.username
        template.created_at = datetime.now().isoformat()
        template.updated_at = datetime.now().isoformat()
        
        await db.report_templates.insert_one(template.dict())
        
        logger.info(f"Template created: {template.id} by {current_user.username}")
        return {"success": True, "template": template.dict(), "message": "Template created successfully"}
    
    except Exception as e:
        logger.error(f"Error creating template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{template_id}")
async def update_template(
    template_id: str,
    update_data: TemplateUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an existing template"""
    try:
        template = await db.report_templates.find_one({"id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Build update dict
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.now().isoformat()
        
        await db.report_templates.update_one(
            {"id": template_id},
            {"$set": update_dict}
        )
        
        logger.info(f"Template updated: {template_id} by {current_user.username}")
        return {"success": True, "message": "Template updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{template_id}/activate")
async def activate_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Set a template as active (deactivates all others)"""
    try:
        # Deactivate all templates
        await db.report_templates.update_many(
            {},
            {"$set": {"is_active": False}}
        )
        
        # Activate the selected template
        result = await db.report_templates.update_one(
            {"id": template_id},
            {"$set": {"is_active": True, "updated_at": datetime.now().isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        
        logger.info(f"Template activated: {template_id} by {current_user.username}")
        return {"success": True, "message": "Template activated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{template_id}/upload-logo")
async def upload_logo(
    template_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a logo for the template"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        filename = f"logo_{template_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        filepath = os.path.join(LOGOS_DIR, filename)
        
        # Save file
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Update template
        await db.report_templates.update_one(
            {"id": template_id},
            {"$set": {
                "logo_path": filepath,
                "logo_url": f"/api/report-templates/{template_id}/logo",
                "updated_at": datetime.now().isoformat()
            }}
        )
        
        logger.info(f"Logo uploaded for template: {template_id}")
        return {
            "success": True,
            "message": "Logo uploaded successfully",
            "logo_path": filepath,
            "logo_url": f"/api/report-templates/{template_id}/logo"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading logo: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{template_id}/logo")
async def get_logo(template_id: str):
    """Get the logo image for a template"""
    try:
        from fastapi.responses import FileResponse
        
        template = await db.report_templates.find_one({"id": template_id})
        if not template or not template.get("logo_path"):
            raise HTTPException(status_code=404, detail="Logo not found")
        
        logo_path = template["logo_path"]
        if not os.path.exists(logo_path):
            raise HTTPException(status_code=404, detail="Logo file not found")
        
        return FileResponse(logo_path)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving logo: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a template"""
    try:
        template = await db.report_templates.find_one({"id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Don't allow deleting the active template
        if template.get("is_active"):
            raise HTTPException(status_code=400, detail="Cannot delete active template")
        
        # Delete logo file if exists
        if template.get("logo_path"):
            try:
                os.remove(template["logo_path"])
            except:
                pass
        
        await db.report_templates.delete_one({"id": template_id})
        
        logger.info(f"Template deleted: {template_id} by {current_user.username}")
        return {"success": True, "message": "Template deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
