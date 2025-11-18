# iReport / JasperReports Integration Guide

## Overview

ArgusUI now supports exporting reports in **JasperReports XML format**, making it compatible with **iReport Designer** and **JasperReports**. This allows you to create professional, customized reports using your preferred reporting tool.

## Supported Export Formats

ArgusUI supports the following report export formats (Requirement 4_18 compliant):

| Format | Description | Use Case |
|--------|-------------|----------|
| **PDF** | Portable Document Format | Ready-to-share reports |
| **CSV** | Comma Separated Values | Data import into Excel/databases |
| **Excel** | Microsoft Excel (.xlsx) | Spreadsheet analysis |
| **Word** | Microsoft Word (.docx) | Editable documents |
| **XML** | Standard XML | Generic data exchange |
| **TXT** | Plain Text | Simple text reports |
| **JASPER** | JasperReports XML | iReport/JasperReports integration |

---

## TXT (Plain Text) Export

### Features
- Clean, formatted plain text output
- ASCII table formatting for data
- Section headers and separators
- No special software required

### Use Cases
- Quick data review
- Email reports
- Command-line processing
- Documentation

### Example Output
```
================================================================================
                         Measurement Results Report                         
================================================================================

Report ID: rep_20251118_001
Report Type: measurement_results
Created By: admin
Created At: 2025-11-18T23:15:00

--------------------------------------------------------------------------------

Measurement Data
================

Frequency (MHz) | Level (dBm) | Station    | Timestamp          
----------------------------------------------------------------
88.500          | -45.2       | Station_01 | 2025-11-18 10:00:00
89.100          | -52.8       | Station_01 | 2025-11-18 10:01:00
90.300          | -48.5       | Station_02 | 2025-11-18 10:02:00

Statistics:
--------------------
Total Measurements: 150
Average Level: -48.3 dBm
Max Level: -35.1 dBm
```

---

## JasperReports / iReport Integration

### What is JasperReports?

**JasperReports** is an open-source Java reporting engine. **iReport** is the visual report designer that creates `.jrxml` template files.

### Prerequisites

1. **Install iReport Designer**
   - Download from: [JasperSoft Community](https://community.jaspersoft.com/)
   - Or use JasperSoft Studio (newer alternative)

2. **Java Runtime**
   - Java 8+ required
   - Available at: https://www.java.com/

### Workflow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  ArgusUI    │────▶│ JASPER XML   │────▶│  iReport    │
│  Generate   │     │  Data File   │     │  Designer   │
└─────────────┘     └──────────────┘     └─────────────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │   Custom    │
                                         │   Report    │
                                         │   (.jrxml)  │
                                         └─────────────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │  PDF/HTML   │
                                         │   Output    │
                                         └─────────────┘
```

---

## Step-by-Step Guide: Using JASPER Export with iReport

### Step 1: Generate JASPER XML from ArgusUI

1. Navigate to **Reports** → **Generate Reports**
2. Select your report type (e.g., Measurement Results)
3. Configure report parameters:
   - Report Name
   - Date Range
   - Filters
4. Select **Export Format: JasperReports**
5. Click **Generate Report**
6. Download the generated `.xml` file

### Step 2: Understanding the XML Structure

The generated JASPER XML has the following structure:

```xml
<JasperReport reportName="Measurement Results Report">
  <ReportMetadata>
    <ReportID>rep_20251118_001</ReportID>
    <ReportType>measurement_results</ReportType>
    <CreatedBy>admin</CreatedBy>
    ...
  </ReportMetadata>
  
  <Sections>
    <Section title="Measurement Data">
      <Tables>
        <Table name="Measurements">
          <Headers>
            <Header>Frequency (MHz)</Header>
            <Header>Level (dBm)</Header>
            <Header>Station</Header>
          </Headers>
          <Rows>
            <Row>
              <Cell column="Frequency (MHz)">88.500</Cell>
              <Cell column="Level (dBm)">-45.2</Cell>
              <Cell column="Station">Station_01</Cell>
            </Row>
            ...
          </Rows>
        </Table>
      </Tables>
      
      <Statistics>
        <Statistic label="Total Measurements">150</Statistic>
        <Statistic label="Average Level">-48.3 dBm</Statistic>
      </Statistics>
    </Section>
  </Sections>
</JasperReport>
```

### Step 3: Create Report Template in iReport

1. **Open iReport Designer**

2. **Create New Report**
   - File → New → Blank Report
   - Choose template (e.g., A4 Portrait)

3. **Configure Data Source**
   - Right-click on report → Edit Query
   - Language: **XPath**
   - Query: `/JasperReport/Sections/Section/Tables/Table/Rows/Row`
   
4. **Add XML Data Source**
   - Report Inspector → Parameters → Add Parameter
   - Name: `XML_DATA_SOURCE`
   - Class: `java.lang.String`

5. **Map Fields from XML**
   - Right-click report → Add Field
   - Field Name: `frequency`
   - Field Expression: `$F{Cell[@column='Frequency (MHz)']}`
   - Field Class: `java.lang.String`
   
   Repeat for other columns:
   - `level`: `$F{Cell[@column='Level (dBm)']}`
   - `station`: `$F{Cell[@column='Station']}`

6. **Design Report Layout**
   - Add Title band
   - Add Column Headers
   - Add Detail band with fields
   - Add Summary band with statistics

### Step 4: Fill Report with Data

1. **Preview Report**
   - Click Preview button
   - Select XML file generated from ArgusUI
   - Report will render with your data

2. **Export Final Report**
   - PDF, HTML, Excel, etc.
   - Use built-in JasperReports exporters

---

## Example iReport Query (XPath)

For accessing measurement data:
```xpath
/JasperReport/Sections/Section[@title='Measurement Data']/Tables/Table[@name='Measurements']/Rows/Row
```

For accessing statistics:
```xpath
/JasperReport/Sections/Section/Statistics/Statistic
```

For report metadata:
```xpath
/JasperReport/ReportMetadata
```

---

## Sample Field Expressions

| Field | XPath Expression |
|-------|------------------|
| Frequency | `Cell[@column='Frequency (MHz)']` |
| Level | `Cell[@column='Level (dBm)']` |
| Station | `Cell[@column='Station']` |
| Timestamp | `Cell[@column='Timestamp']` |

---

## Advanced Features

### Using Report Parameters

Access report metadata in your template:

```xpath
<!-- Report Name -->
/JasperReport/ReportMetadata/ReportName

<!-- Created By -->
/JasperReport/ReportMetadata/CreatedBy

<!-- Date Range (from filters) -->
/JasperReport/ReportMetadata/Filters/Filter[@name='start_date']
```

### Multiple Tables in One Report

The XML can contain multiple tables per section:

```xpath
<!-- First table -->
/JasperReport/Sections/Section/Tables/Table[1]/Rows/Row

<!-- Second table -->
/JasperReport/Sections/Section/Tables/Table[2]/Rows/Row
```

### Including Statistics

Add a summary band with statistics:

```xml
<textField>
  <textFieldExpression>
    "Total: " + $F{/JasperReport/Sections/Section/Statistics/Statistic[@label='Total Measurements']}
  </textFieldExpression>
</textField>
```

---

## Troubleshooting

### Common Issues

**Issue**: XML file not loading in iReport
- **Solution**: Ensure XML is well-formed. Open in browser to check for errors.

**Issue**: Fields showing null values
- **Solution**: Check XPath expressions match XML structure exactly.

**Issue**: Java heap space error
- **Solution**: Increase Java heap size in iReport.ini:
  ```
  -Xms128m
  -Xmx1024m
  ```

### Validation

To validate your JASPER XML:
```bash
# Using xmllint (Linux/Mac)
xmllint --noout your_report_jasper.xml

# Should return nothing if valid
```

---

## API Reference

### Generate Report with JASPER Format

**Endpoint**: `POST /api/reports/create`

**Request Body**:
```json
{
  "report_type": "measurement_results",
  "report_name": "My Measurement Report",
  "description": "Frequency scan analysis",
  "export_format": "JASPER",
  "filters": {
    "start_date": "2025-11-01",
    "end_date": "2025-11-18"
  },
  "include_charts": true,
  "include_summary": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Report generation started",
  "report_id": "rep_20251118_001",
  "status": "generating"
}
```

### Download Generated Report

**Endpoint**: `GET /api/reports/{report_id}/download`

---

## Best Practices

1. **Template Reusability**
   - Create generic .jrxml templates
   - Use parameters for dynamic content
   - Store templates in version control

2. **Performance**
   - Limit data ranges for large datasets
   - Use subreports for complex layouts
   - Cache frequently used templates

3. **Styling**
   - Match ArgusUI theme colors in reports
   - Use organization branding
   - Include logos and headers

4. **Data Validation**
   - Always preview XML before importing
   - Validate against expected structure
   - Handle missing data gracefully

---

## Additional Resources

- **JasperReports Documentation**: https://community.jaspersoft.com/documentation
- **iReport Tutorial**: https://community.jaspersoft.com/wiki/ireport-designer-getting-started
- **XPath Reference**: https://www.w3.org/TR/xpath/
- **ArgusUI Reports API**: See `/app/backend/reports_api.py`

---

## Support

For issues or questions:
- Check ArgusUI logs: `/var/log/supervisor/backend.*.log`
- Review generated XML structure
- Consult JasperReports community forums

---

**Version**: ArgusUI v0.3+  
**Last Updated**: 2025-11-18  
**Compliance**: Requirement 4_18
