#!/usr/bin/env python3
"""
Test script to create a mock GSP response file in the outbox
This simulates what the real Argus system would do
"""

import os
import shutil
from datetime import datetime

def create_mock_gsp_response():
    """Create a mock GSP response file in the outbox for testing"""
    
    # GSP response XML content - based on your provided example
    xml_content = '''<?xml version="1.0" encoding="UTF-8"?>
<XMLSchema1 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <ORDER_DEF>
        <ORDER_ID>GSP251030120000000</ORDER_ID>
        <ORDER_TYPE>GSP</ORDER_TYPE>
        <ORDER_NAME>SystemParametersQuery</ORDER_NAME>
        <ORDER_SENDER>HQ4</ORDER_SENDER>
        <ORDER_SENDER_PC>SRVARGUS</ORDER_SENDER_PC>
        <ORDER_STATE>Finished</ORDER_STATE>
        <ORDER_CREATOR>Extern</ORDER_CREATOR>
        <EXECUTION_TYPE>A</EXECUTION_TYPE>
        <ORDER_VER>300</ORDER_VER>
    </ORDER_DEF>
    
    <MONSYS_STRUCTURE>
        <MSS_ST_NAME>TestStation_Main</MSS_ST_NAME>
        <MSS_RMC>MAIN</MSS_RMC>
        <MSS_RMC_PC>SRVARGUS</MSS_RMC_PC>
        <MSS_ST_TYPE>F</MSS_ST_TYPE>
        <MSS_LONG>-122.4194</MSS_LONG>
        <MSS_LAT>37.7749</MSS_LAT>
        <MSS_RUN>Y</MSS_RUN>
        <MSS_USER>admin</MSS_USER>
        
        <!-- Signal Path 1: VHF Monitoring -->
        <MSS_PATHS>
            <MP_NAME>ADD197+075-EB500_DF</MP_NAME>
            <MP_FR_L>30000000</MP_FR_L>
            <MP_FR_U>300000000</MP_FR_U>
            <MP_DEV>
                <D_NAME>EB500_Main_Receiver</D_NAME>
                <D_DRIVER>EB500</D_DRIVER>
                <D_DET>RMS</D_DET>
                <D_DET>PEAK</D_DET>
                <D_DET>AVG</D_DET>
                <D_DET>QPEAK</D_DET>
                <D_IFBW>100</D_IFBW>
                <D_IFBW>1000</D_IFBW>
                <D_IFBW>10000</D_IFBW>
                <D_IFBW>100000</D_IFBW>
                <D_IFBW>200000</D_IFBW>
                <D_RFATTN>0</D_RFATTN>
                <D_RFATTN>10</D_RFATTN>
                <D_RFATTN>20</D_RFATTN>
                <D_RFATTN>30</D_RFATTN>
                <D_IFATTN>0</D_IFATTN>
                <D_IFATTN>10</D_IFATTN>
                <D_DEMOD>AM</D_DEMOD>
                <D_DEMOD>FM</D_DEMOD>
                <D_DEMOD>USB</D_DEMOD>
                <D_DEMOD>LSB</D_DEMOD>
                <D_DEMOD>CW</D_DEMOD>
                <D_MPARAM>FFM</D_MPARAM>
                <D_MPARAM>SCAN</D_MPARAM>
                <D_MPARAM>DSCAN</D_MPARAM>
                <D_MPARAM>PSCAN</D_MPARAM>
                <D_MODE>LVL</D_MODE>
                <D_MODE>FLD</D_MODE>
                <D_MODE>OCCUP</D_MODE>
            </MP_DEV>
            <MP_DEV>
                <D_NAME>ADD197_DF_Antenna</D_NAME>
                <D_DRIVER>ANTENNA08</D_DRIVER>
                <D_MPARAM>DSCAN</D_MPARAM>
                <D_MPARAM>LOCATION</D_MPARAM>
                <D_AZI>0</D_AZI>
                <D_AZI>45</D_AZI>
                <D_AZI>90</D_AZI>
                <D_AZI>135</D_AZI>
                <D_AZI>180</D_AZI>
                <D_AZI>225</D_AZI>
                <D_AZI>270</D_AZI>
                <D_AZI>315</D_AZI>
            </MP_DEV>
        </MSS_PATHS>
        
        <!-- Signal Path 2: UHF Monitoring -->
        <MSS_PATHS>
            <MP_NAME>HE600-EB500_mon</MP_NAME>
            <MP_FR_L>300000000</MP_FR_L>
            <MP_FR_U>3000000000</MP_FR_U>
            <MP_DEV>
                <D_NAME>HE600_UHF_Receiver</D_NAME>
                <D_DRIVER>EB500</D_DRIVER>
                <D_DET>RMS</D_DET>
                <D_DET>PEAK</D_DET>
                <D_DET>AVG</D_DET>
                <D_IFBW>1000</D_IFBW>
                <D_IFBW>10000</D_IFBW>
                <D_IFBW>100000</D_IFBW>
                <D_IFBW>200000</D_IFBW>
                <D_RFATTN>0</D_RFATTN>
                <D_RFATTN>10</D_RFATTN>
                <D_RFATTN>20</D_RFATTN>
                <D_DEMOD>AM</D_DEMOD>
                <D_DEMOD>FM</D_DEMOD>
                <D_DEMOD>NFM</D_DEMOD>
                <D_MPARAM>FFM</D_MPARAM>
                <D_MPARAM>SCAN</D_MPARAM>
                <D_MODE>LVL</D_MODE>
                <D_MODE>FLD</D_MODE>
            </MP_DEV>
        </MSS_PATHS>
        
        <!-- Signal Path 3: Default Measurement Path -->
        <MSS_PATHS>
            <MP_NAME>Default_dBuV-EB500_m</MP_NAME>
            <MP_FR_L>9000</MP_FR_L>
            <MP_FR_U>7500000000</MP_FR_U>
            <MP_DEV>
                <D_NAME>Default_EB500</D_NAME>
                <D_DRIVER>EB500</D_DRIVER>
                <D_DET>RMS</D_DET>
                <D_DET>PEAK</D_DET>
                <D_IFBW>1000</D_IFBW>
                <D_IFBW>10000</D_IFBW>
                <D_IFBW>100000</D_IFBW>
                <D_RFATTN>0</D_RFATTN>
                <D_RFATTN>10</D_RFATTN>
                <D_MPARAM>FFM</D_MPARAM>
                <D_MPARAM>SCAN</D_MPARAM>
                <D_MODE>LVL</D_MODE>
            </MP_DEV>
        </MSS_PATHS>
    </MONSYS_STRUCTURE>
    
    <MONSYS_STRUCTURE>
        <MSS_ST_NAME>Mobile_Unit_West</MSS_ST_NAME>
        <MSS_RMC>MW01</MSS_RMC>
        <MSS_RMC_PC>MOBILE_WEST</MSS_RMC_PC>
        <MSS_ST_TYPE>M</MSS_ST_TYPE>
        <MSS_LONG>-122.4500</MSS_LONG>
        <MSS_LAT>37.8000</MSS_LAT>
        <MSS_RUN>Y</MSS_RUN>
        <MSS_USER>operator</MSS_USER>
        
        <!-- Mobile Unit Signal Path -->
        <MSS_PATHS>
            <MP_NAME>Mobile_VHF_Scanner</MP_NAME>
            <MP_FR_L>30000000</MP_FR_L>
            <MP_FR_U>300000000</MP_FR_U>
            <MP_DEV>
                <D_NAME>Mobile_EB500</D_NAME>
                <D_DRIVER>EB500</D_DRIVER>
                <D_DET>RMS</D_DET>
                <D_DET>PEAK</D_DET>
                <D_IFBW>1000</D_IFBW>
                <D_IFBW>10000</D_IFBW>
                <D_RFATTN>0</D_RFATTN>
                <D_RFATTN>10</D_RFATTN>
                <D_DEMOD>AM</D_DEMOD>
                <D_DEMOD>FM</D_DEMOD>
                <D_MPARAM>FFM</D_MPARAM>
                <D_MPARAM>SCAN</D_MPARAM>
                <D_MODE>LVL</D_MODE>
            </MP_DEV>
        </MSS_PATHS>
    </MONSYS_STRUCTURE>
    
    <ACD_ERR>S</ACD_ERR>
</XMLSchema1>'''
    
    # Create outbox directory if it doesn't exist
    outbox_path = "/tmp/argus_outbox"
    os.makedirs(outbox_path, exist_ok=True)
    
    # Generate filename: GSP-YYMMDD-HHMMSSXXX-R.xml
    now = datetime.now()
    date_part = now.strftime("%y%m%d")
    time_part = now.strftime("%H%M%S")
    counter = now.strftime("%f")[:3]
    
    filename = f"GSP-{date_part}-{time_part}{counter}-R.xml"
    filepath = os.path.join(outbox_path, filename)
    
    # Write the file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(xml_content)
    
    print(f"✅ Created mock GSP response file: {filename}")
    print(f"📁 Location: {filepath}")
    print(f"\n📊 Response contains:")
    print(f"   - 2 Stations (TestStation_Main, Mobile_Unit_West)")
    print(f"   - 4 Signal Paths")
    print(f"   - Multiple devices with capabilities")
    print(f"\n⏳ File watcher should process this within seconds...")
    print(f"   Check: /tmp/argus_data/xml_responses/ (processed files)")
    print(f"   Check: MongoDB system_parameters collection")
    print(f"   Check: Frontend System Parameters page")
    
    return filepath

if __name__ == "__main__":
    print("🚀 GSP Response Test Script")
    print("=" * 60)
    print("This script creates a mock GSP response file to test the")
    print("file watcher and signal path integration.\n")
    
    filepath = create_mock_gsp_response()
    
    print("\n" + "=" * 60)
    print("✨ To verify the system is working:")
    print("   1. Wait 2-3 seconds for file watcher to process")
    print("   2. Go to frontend: System Parameters page")
    print("   3. You should see the stations and signal paths")
    print("   4. Go to Automatic Mode → AMM Wizard → Step 4")
    print("   5. Signal paths should be available in dropdown")
