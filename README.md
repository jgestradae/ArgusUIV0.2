# ArgusUI v0.2 - Spectrum Monitoring Control System

**Professional web interface for R&S Argus spectrum monitoring systems**

![ArgusUI Dashboard](https://img.shields.io/badge/Version-0.2-blue.svg) ![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-lightgrey.svg) ![License](https://img.shields.io/badge/License-Internal%20Use-green.svg)

## 🚀 **What's New in Version 0.2**

### ✨ **New Features:**
- **🤖 Automatic Mode (AMM)** - Complete R&S Argus AMM implementation with scheduling
- **📊 Data Navigator** - Multi-type data management (measurements, graphs, audio, logs)
- **🏢 Active Directory Integration** - Windows AD authentication support
- **🖥️ Windows Deployment** - Simplified local network deployment (no nginx required)

### 🔧 **Improvements:**
- Fixed dependency conflicts for Windows deployment
- Enhanced XML processing for Argus integration
- Professional spectrum monitoring UI theme
- Comprehensive error handling and logging
- Production-ready startup/stop scripts

---

## 📋 **System Requirements**

### **Windows Server (Recommended for Argus Integration)**
- Windows Server 2016+ or Windows 10/11 Pro
- R&S Argus 6.1+ installed
- Python 3.8+
- Node.js 16+
- MongoDB 5.0+
- 4GB RAM minimum, 8GB recommended
- 10GB free disk space

### **Network Requirements**
- Internal network access
- Ports 3000 (frontend) and 8001 (backend)
- Access to Argus INBOX/OUTBOX directories

---

## 🚀 **Quick Start (Windows Local Network)**

### **Step 1: Clone Repository**
```cmd
git clone https://github.com/yourusername/ArgusUI-v0.2.git
cd ArgusUI-v0.2
```

### **Step 2: Run Setup Script**
```cmd
# Run as Administrator
setup-argusui.bat
```

### **Step 3: Start ArgusUI**
```cmd
run-argusui.bat
```

### **Step 4: Access Interface**
- **Local**: http://localhost:3000
- **Network**: http://[your-server-ip]:3000
- **Login**: admin / admin123

---

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    Internal Network                         │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────┐│
│  │   Windows       │◄──►│   ArgusUI       │◄──►│ User     ││
│  │   Server        │    │   Web App       │    │ Browsers ││
│  │   + Argus       │    │                 │    │          ││
│  │   + ArgusUI     │    │   React + API   │    │          ││
│  └─────────────────┘    └─────────────────┘    └──────────┘│
│           │                       │                        │
│           ▼                       ▼                        │
│  ┌─────────────────┐    ┌─────────────────┐               │
│  │ Argus INBOX/    │    │    MongoDB      │               │
│  │ OUTBOX Files    │    │    Database     │               │
│  └─────────────────┘    └─────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 **Core Features**

### **🎛️ System Status**
- Real-time Argus system monitoring
- Live device and station status
- System health indicators
- Automatic status updates

### **⚡ Direct Measurement**
- Single frequency measurements (FFM)
- Frequency scanning (SCAN, DSCAN, PSCAN)
- Real-time measurement configuration
- Advanced receiver settings

### **🤖 Automatic Mode (AMM)**
- **Scheduling**: Always, Daily, Weekdays, Interval, Span
- **Measurement Types**: FFM, SCAN, FLSCAN, TLSCAN, Location
- **Alarm Management**: Threshold monitoring, notifications
- **4-Step Wizard**: Easy AMM configuration

### **📊 Data Navigator**
- **6 Data Types**: Measurements, Graphs, Audio, Registry, Logs, Auto-Definitions
- **Metadata Management**: Searchable, filterable data tables
- **File Integration**: Links to actual measurement files
- **Export Capabilities**: CSV, file downloads

### **⚙️ Configuration**
- System parameter management
- Measurement templates
- User management (Admin/Operator roles)
- Argus file path configuration

### **📋 System Logs**
- Real-time event monitoring
- Measurement history tracking
- Error logging and troubleshooting
- Export and filtering capabilities

---

## 🔧 **Installation Guide**

### **Detailed Setup (Windows Server)**

#### **Prerequisites Installation:**
```cmd
# 1. Install Python 3.8+
# Download from: https://www.python.org/downloads/

# 2. Install Node.js 16+
# Download from: https://nodejs.org/

# 3. Install MongoDB Community
# Download from: https://www.mongodb.com/try/download/community

# 4. Install Git for Windows
# Download from: https://git-scm.com/download/win
```

#### **ArgusUI Installation:**
```cmd
# Clone repository
git clone https://github.com/yourusername/ArgusUI-v0.2.git
cd ArgusUI-v0.2

# Run automated setup
setup-argusui.bat

# Configure for your environment
notepad backend\.env
# Update ARGUS_INBOX_PATH and ARGUS_OUTBOX_PATH

# Start services
run-argusui.bat
```

#### **Network Configuration:**
```cmd
# Run as Administrator to configure firewall
network-config.bat

# Find your server IP
ipconfig | findstr IPv4
```

---

## ⚙️ **Configuration**

### **Backend Configuration (`backend/.env`)**
```env
# Argus Integration
ARGUS_INBOX_PATH=C:\Program Files\Rohde-Schwarz\Argus\INBOX
ARGUS_OUTBOX_PATH=C:\Program Files\Rohde-Schwarz\Argus\OUTBOX
ARGUS_DATA_PATH=C:\ArgusUI\data

# Database
MONGO_URL=mongodb://localhost:27017/argusui_production

# Network (update with your server IP)
CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3000

# Active Directory (optional)
AD_ENABLED=false
AD_SERVER=ldap://your-dc.domain.com
AD_DOMAIN=your-domain.com
```

### **Frontend Configuration (`frontend/.env`)**
```env
# Backend API URL (update with your server IP)
REACT_APP_BACKEND_URL=http://localhost:8001
# For network access: http://192.168.1.100:8001
```

---

## 🔐 **Security & Authentication**

### **Local Authentication**
- **Default Admin**: admin / admin123
- **Role-based Access**: Admin, Operator
- **JWT Token Security**: 30-minute sessions

### **Active Directory Integration**
- Windows domain authentication
- Automatic user provisioning
- Group-based role mapping
- See `docs/active-directory-setup.md` for configuration

---

## 🧪 **Testing & Validation**

### **System Health Check**
```cmd
# Test all components
test-argusui.bat

# Test individual components
cd backend
python test-install.py

cd ../frontend
npm test
```

### **Argus Integration Test**
```cmd
# Test XML file communication
cd backend
python test-argus-xml.py
```

---

## 📁 **Project Structure**

```
ArgusUI-v0.2/
├── 📁 backend/                 # FastAPI Backend
│   ├── 📄 server.py           # Main API server
│   ├── 📄 models.py           # Data models
│   ├── 📄 xml_processor.py    # Argus XML handling
│   ├── 📄 amm_models.py       # AMM data models
│   ├── 📄 amm_scheduler.py    # AMM scheduler
│   ├── 📄 amm_api.py         # AMM API endpoints
│   ├── 📄 data_models.py      # Data Navigator models
│   ├── 📄 data_navigator_api.py # Data API
│   ├── 📄 auth.py            # Authentication
│   ├── 📄 ad_auth.py         # Active Directory auth
│   ├── 📄 requirements.txt    # Python dependencies
│   ├── 📄 .env               # Backend configuration
│   └── 📁 venv/              # Python virtual environment
├── 📁 frontend/               # React Frontend
│   ├── 📁 src/
│   │   ├── 📄 App.js         # Main React app
│   │   ├── 📁 components/    # React components
│   │   │   ├── 📄 Dashboard.js
│   │   │   ├── 📄 SystemStatus.js
│   │   │   ├── 📄 DirectMeasurement.js
│   │   │   ├── 📄 AutomaticMode.js
│   │   │   ├── 📄 DataNavigator.js
│   │   │   ├── 📄 Configuration.js
│   │   │   └── 📄 SystemLogs.js
│   │   └── 📁 contexts/      # React contexts
│   ├── 📄 package.json      # Frontend dependencies
│   ├── 📄 .env              # Frontend configuration
│   └── 📁 node_modules/     # Node dependencies
├── 📁 scripts/               # Deployment scripts
│   ├── 📄 setup-argusui.bat # Complete setup
│   ├── 📄 run-argusui.bat   # Start services
│   ├── 📄 stop-argusui.bat  # Stop services
│   ├── 📄 network-config.bat # Network setup
│   └── 📄 test-argusui.bat  # System testing
├── 📁 docs/                 # Documentation
│   ├── 📄 installation.md   # Detailed installation
│   ├── 📄 configuration.md  # Configuration guide
│   ├── 📄 active-directory-setup.md
│   └── 📄 troubleshooting.md
├── 📄 README.md             # This file
├── 📄 CHANGELOG.md          # Version history
└── 📄 VERSION               # Current version
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **Backend Won't Start**
```cmd
# Check Python environment
cd backend
venv\Scripts\activate
python --version
pip list

# Check MongoDB
net start MongoDB
mongo --eval "db.runCommand({connectionStatus: 1})"
```

#### **Frontend Won't Start**
```cmd
# Clear npm cache and reinstall
cd frontend
npm cache clean --force
rmdir /s node_modules
npm install --legacy-peer-deps
```

#### **Network Access Issues**
```cmd
# Check Windows Firewall
netsh advfirewall firewall show rule name="ArgusUI-Frontend"
netsh advfirewall firewall show rule name="ArgusUI-Backend"

# Test ports
telnet localhost 3000
telnet localhost 8001
```

#### **Argus Integration Issues**
- Verify Argus installation path in `.env`
- Check INBOX/OUTBOX directory permissions
- Test XML file creation manually

---

## 📞 **Support**

### **Getting Help**
- 📧 **Email**: [your-support-email]
- 📚 **Documentation**: `/docs` folder
- 🐛 **Issues**: GitHub Issues tab
- 💬 **Internal Support**: [Your IT Team Contact]

### **System Requirements Check**
```cmd
# Run system check
system-check.bat

# Generate support report
support-report.bat
```

---

## 📄 **License**

This software is for **internal use only** within your organization. See LICENSE file for details.

---

## 🚀 **Deployment Environments**

- **Development**: Emergent Platform (Linux)
- **Production**: Windows Server (Local Network)
- **Testing**: Windows 10/11 (Standalone)

---

## 📈 **Roadmap**

### **Version 0.3 (Planned)**
- Enhanced Argus integration
- Advanced reporting features
- Mobile-responsive improvements
- Performance optimizations

### **Future Versions**
- Multi-station support
- Advanced analytics
- Cloud deployment options
- API integrations

---

**🎯 ArgusUI v0.2 - Professional Spectrum Monitoring Made Simple**

*Built for R&S Argus • Optimized for Internal Networks • Enterprise Ready*
