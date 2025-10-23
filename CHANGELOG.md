# Changelog - ArgusUI

All notable changes to ArgusUI will be documented in this file.

## [0.2.0] - 2025-10-07

### 🎉 **Major Features Added**

#### **🤖 Automatic Mode (AMM)**
- Complete R&S Argus AMM implementation based on official documentation
- **Scheduling Types**: Always, Daily, Weekdays, Interval, Time Span
- **Measurement Types**: FFM, SCAN, DSCAN, PSCAN, FLSCAN, TLSCAN, Location, Coverage
- **4-Step Configuration Wizard**: Basic Info → Timing → Measurement → Review
- **AMM Dashboard**: Real-time statistics, execution monitoring
- **Advanced Features**: Alarm configuration, notification system, result management
- **Backend Scheduler**: Automatic execution with cron-like scheduling
- **Database Integration**: Complete AMM configuration and execution tracking

#### **📊 Data Navigator**
- **Multi-Type Data Management**: 6 different data categories
  - Measurement Results (.xml, .json)
  - Graphs & Charts (.png, .jpg)
  - Audio Recordings (.wav, .mp3)
  - Registry Files (.json, .txt)
  - User Logs (.txt, .csv)
  - Automatic Definitions (.json)
- **Tabbed Interface**: Easy navigation between data types
- **Metadata + File Storage**: Hybrid architecture with MongoDB metadata and file references
- **Search & Filter**: Advanced filtering by name, date, creator, tags
- **File Operations**: Preview, download, delete capabilities
- **Statistics Dashboard**: Data count, storage usage, latest updates

#### **🏢 Active Directory Integration**
- **Windows AD Authentication**: LDAP/LDAPS support
- **Group-Based Roles**: Automatic admin/operator role assignment
- **Service Account Configuration**: Secure LDAP binding
- **Hybrid Authentication**: AD + local user fallback
- **User Provisioning**: Automatic user creation from AD
- **Configuration Templates**: Easy AD setup with .env variables

### 🔧 **Infrastructure Improvements**

#### **🖥️ Windows Deployment**
- **No Nginx Required**: Simplified deployment using React dev server + FastAPI
- **Automated Setup Scripts**: Complete installation automation
  - `setup-argusui.bat` - Full system setup
  - `run-argusui.bat` - Service startup
  - `stop-argusui.bat` - Service shutdown
  - `network-config.bat` - Firewall configuration
  - `test-argusui.bat` - System testing
- **Local Network Ready**: Internal network configuration
- **Windows Service Integration**: Optional Windows service deployment
- **Firewall Automation**: Automatic port configuration (3000, 8001)

#### **📦 Dependency Management**
- **Fixed Windows Compatibility**: Resolved npm peer dependency conflicts
- **Updated Requirements**: Windows-tested Python packages
- **Legacy Peer Deps**: Configured for reliable npm installs
- **Version Pinning**: Stable versions for production deployment

### 🎨 **User Interface Enhancements**

#### **🎛️ Enhanced Dashboard**
- **System Metrics**: Real-time Argus status, active measurements
- **Quick Actions**: Direct access to measurement and configuration
- **Statistics Cards**: Visual system health indicators
- **Navigation Improvements**: Added Automatic Mode and Data Navigator

#### **⚡ Direct Measurement Improvements**
- **Enhanced Configuration**: Advanced receiver and antenna settings
- **Measurement Templates**: Save and reuse configurations
- **Real-time Status**: Live measurement progress tracking
- **Result History**: Recent measurement tracking

#### **🔐 Authentication Enhancements**
- **Role-Based UI**: Admin/Operator specific interfaces
- **Session Management**: Improved JWT token handling
- **User Management**: Admin user creation and management
- **Security Indicators**: Visual role and status indicators

### 🐛 **Bug Fixes**

#### **Backend Fixes**
- Fixed MongoDB ObjectID serialization issues
- Resolved XML parsing edge cases
- Improved error handling in Argus communication
- Fixed authentication token refresh issues

#### **Frontend Fixes**
- Resolved React component mounting issues
- Fixed responsive design on mobile devices
- Improved error message display
- Fixed navigation state management

#### **Deployment Fixes**
- Resolved Windows path handling issues
- Fixed npm dependency conflicts
- Improved startup script reliability
- Fixed firewall configuration automation

### 🔒 **Security Improvements**
- **Enhanced Password Hashing**: Updated bcrypt implementation
- **CORS Configuration**: Proper internal network CORS setup
- **Input Validation**: Enhanced API input sanitization
- **Session Security**: Improved JWT token management
- **File Access Control**: Secure file operation permissions

### 📚 **Documentation**
- **Complete Installation Guide**: Step-by-step Windows deployment
- **Configuration Documentation**: Detailed .env file setup
- **Active Directory Setup**: Complete AD integration guide
- **Troubleshooting Guide**: Common issues and solutions
- **API Documentation**: Updated endpoint documentation

### 🧪 **Testing & Quality**
- **Windows Testing**: Comprehensive Windows Server testing
- **Integration Testing**: Full Argus XML communication testing
- **UI Testing**: Cross-browser compatibility testing
- **Performance Testing**: Load testing for internal networks

---

## [0.1.0] - 2025-10-04

### 🎉 **Initial Release**

#### **Core Features**
- **Authentication System**: JWT-based login with admin/operator roles
- **Dashboard**: System overview with real-time metrics
- **System Status**: Live Argus monitoring (GSS/GSP XML commands)
- **Direct Measurement**: Manual spectrum measurements (FFM, SCAN)
- **Configuration**: System settings and measurement templates
- **System Logs**: Event monitoring and history

#### **Technical Foundation**
- **Backend**: FastAPI with MongoDB integration
- **Frontend**: React with Shadcn UI components
- **Argus Integration**: XML file communication (INBOX/OUTBOX)
- **Database**: MongoDB with hybrid file storage
- **Authentication**: JWT tokens with role-based access

#### **UI/UX**
- **Professional Theme**: Dark spectrum monitoring interface
- **Responsive Design**: Desktop and tablet support
- **Navigation**: Sidebar navigation with role-based menus
- **Real-time Updates**: Live system status and measurements

#### **Deployment**
- **Development**: Emergent platform deployment
- **Production**: Basic Linux deployment scripts
- **Configuration**: Environment variable management

---

## **Version Numbering**

- **Major.Minor.Patch** (e.g., 1.0.0)
- **Major**: Breaking changes or major feature releases
- **Minor**: New features, backwards compatible
- **Patch**: Bug fixes and small improvements

## **Release Schedule**

- **v0.3**: Q1 2025 - Enhanced Argus integration, reporting
- **v0.4**: Q2 2025 - Multi-station support, analytics
- **v1.0**: Q3 2025 - Production release, full feature set

---

**🚀 Each release brings ArgusUI closer to being the definitive spectrum monitoring control solution for R&S Argus systems.**
