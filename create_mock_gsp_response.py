#!/usr/bin/env python3
"""
Create a mock GSP response file to test the GSP workflow
"""

import os
import time
from datetime import datetime

def create_mock_gsp_response(order_id="GSP251030111158700"):
    """Create a mock GSP response XML file"""
    
    # GSP response XML content with signal paths and stations
    xml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<XMLSchema1 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <ORDER_DEF>
        <ORDER_ID>{order_id}</ORDER_ID>
        <ORDER_TYPE>GSP</ORDER_TYPE>
        <ORDER_NAME>SystemParametersQuery</ORDER_NAME>
        <ORDER_SENDER>HQ4</ORDER_SENDER>
        <ORDER_SENDER_PC>SRVARGUS</ORDER_SENDER_PC>
        <ORDER_STATE>Finished</ORDER_STATE>
        <ORDER_CREATOR>Extern</ORDER_CREATOR>
        <EXECUTION_TYPE>A</EXECUTION_TYPE>
        <ORDER_VER>200</ORDER_VER>
    </ORDER_DEF>
    
    <MONSYS_STRUCTURE>
        <MSS_ST_NAME>Station_HQ4</MSS_ST_NAME>
        <MSS_RMC>HQ4</MSS_RMC>
        <MSS_RMC_PC>SRVARGUS</MSS_RMC_PC>
        <MSS_ST_TYPE>F</MSS_ST_TYPE>
        <MSS_LONG>11.5820</MSS_LONG>
        <MSS_LAT>48.1351</MSS_LAT>
        <MSS_RUN>Y</MSS_RUN>
        <MSS_USER>admin</MSS_USER>
        
        <!-- Signal Path 1: VHF Band -->
        <MSS_PATHS>
            <MP_NAME>VHF_Path_1</MP_NAME>
            <MP_FR_L>30000000</MP_FR_L>
            <MP_FR_U>300000000</MP_FR_U>
            <MP_DEV>
                <D_NAME>EB500_Receiver_01</D_NAME>
                <D_DRIVER>EB500</D_DRIVER>
                <D_DET>RMS</D_DET>
                <D_DET>PEAK</D_DET>
                <D_DET>AVG</D_DET>
                <D_IFBW>1000</D_IFBW>
                <D_IFBW>10000</D_IFBW>
                <D_IFBW>100000</D_IFBW>
                <D_RFATTN>0</D_RFATTN>
                <D_RFATTN>10</D_RFATTN>
                <D_RFATTN>20</D_RFATTN>
                <D_DEMOD>AM</D_DEMOD>
                <D_DEMOD>FM</D_DEMOD>
                <D_DEMOD>USB</D_DEMOD>
                <D_DEMOD>LSB</D_DEMOD>
                <D_MPARAM>FFM</D_MPARAM>
                <D_MPARAM>SCAN</D_MPARAM>
                <D_MPARAM>DSCAN</D_MPARAM>
            </MP_DEV>
            <MP_DEV>
                <D_NAME>DF_Antenna_System</D_NAME>
                <D_DRIVER>ANTENNA08</D_DRIVER>
                <D_MPARAM>DSCAN</D_MPARAM>
                <D_MPARAM>LOCATION</D_MPARAM>
            </MP_DEV>
        </MSS_PATHS>
        
        <!-- Signal Path 2: UHF Band -->
        <MSS_PATHS>
            <MP_NAME>UHF_Path_1</MP_NAME>
            <MP_FR_L>300000000</MP_FR_L>
            <MP_FR_U>3000000000</MP_FR_U>
            <MP_DEV>
                <D_NAME>DDF550_Receiver_01</D_NAME>
                <D_DRIVER>DDF550</D_DRIVER>
                <D_DET>RMS</D_DET>
                <D_DET>PEAK</D_DET>
                <D_IFBW>1000</D_IFBW>
                <D_IFBW>10000</D_IFBW>
                <D_IFBW>100000</D_IFBW>
                <D_RFATTN>0</D_RFATTN>
                <D_RFATTN>10</D_RFATTN>
                <D_DEMOD>AM</D_DEMOD>
                <D_DEMOD>FM</D_DEMOD>
                <D_MPARAM>FFM</D_MPARAM>
                <D_MPARAM>SCAN</D_MPARAM>
            </MP_DEV>
        </MSS_PATHS>
    </MONSYS_STRUCTURE>
    
    <MONSYS_STRUCTURE>
        <MSS_ST_NAME>Mobile_Unit_01</MSS_ST_NAME>
        <MSS_RMC>MU01</MSS_RMC>
        <MSS_RMC_PC>MOBILE01</MSS_RMC_PC>
        <MSS_ST_TYPE>M</MSS_ST_TYPE>
        <MSS_LONG>11.5900</MSS_LONG>
        <MSS_LAT>48.1400</MSS_LAT>
        <MSS_RUN>Y</MSS_RUN>
        <MSS_USER>operator</MSS_USER>
        
        <!-- Signal Path 3: Mobile VHF -->
        <MSS_PATHS>
            <MP_NAME>Mobile_VHF_Path</MP_NAME>
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
            </MP_DEV>
        </MSS_PATHS>
    </MONSYS_STRUCTURE>
    
    <ACD_ERR>S</ACD_ERR>
</XMLSchema1>'''
    
    # Create the response file in outbox
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
    
    print(f"Created mock GSP response: {filepath}")
    return filepath

if __name__ == "__main__":
    create_mock_gsp_response()