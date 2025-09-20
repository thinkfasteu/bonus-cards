# FTG Sportfabrik Bonus Cards - Installation Guide

This guide provides complete installation instructions for the FTG Sportfabrik Digital Bonus Cards system.

## System Requirements

### Windows
- Windows 10 (64-bit) or newer
- Minimum 4GB RAM
- 500MB free disk space
- Internet connection for API access

### Linux
- Ubuntu 18.04+ / Pop!_OS / Debian 10+ / RHEL 8+ (64-bit)
- Minimum 4GB RAM
- 500MB free disk space
- Internet connection for API access

## For Development Team: Building Installers

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure all TypeScript files are built
npm run build
npm run build:renderer
tsc -p electron/tsconfig.json
```

### Building Windows Installer (MSI)
```bash
# Build Windows MSI (requires Windows or Wine)
npm run build:win

# Output: dist-installers/bonus-cards-1.0.0.msi
```

### Building Linux Installers
```bash
# Build AppImage and DEB package
npm run build:linux

# Output:
# - dist-installers/bonus-cards-1.0.0.AppImage
# - dist-installers/bonus-cards_1.0.0_amd64.deb
```

### Building All Platforms
```bash
# Build all installers (cross-platform)
npm run build:all
```

### Build Configuration Notes
- Icons are located in `build/icon.png` (Linux) and `build/icon.ico` (Windows)
- Replace with FTG Sportfabrik branded icons before production builds
- Installers are output to `dist-installers/` directory
- Signing certificates should be added to electron-builder config for production

## For IT Staff: Installation Procedures

### Windows Installation

1. **Download the Installer**
   - Obtain `bonus-cards-X.X.X.msi` from the development team
   - Verify file integrity if checksums are provided

2. **Install the Application**
   ```cmd
   # Silent installation (for deployment scripts)
   msiexec /i bonus-cards-1.0.0.msi /quiet

   # Interactive installation (for manual setup)
   # Double-click the MSI file and follow prompts
   ```

3. **Installation Locations**
   - Application: `C:\Program Files\FTG Sportfabrik Bonus Cards\`
   - User Data: `C:\Users\{username}\AppData\Roaming\bonus-cards\`
   - Desktop Shortcut: `C:\Users\{username}\Desktop\FTG Bonus Cards.lnk`
   - Start Menu: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\FTG Bonus Cards.lnk`

### Linux Installation

#### Option 1: AppImage (Portable)
```bash
# Download and make executable
chmod +x bonus-cards-1.0.0.AppImage

# Run directly (no installation required)
./bonus-cards-1.0.0.AppImage

# Optional: Install with AppImageLauncher for better integration
```

#### Option 2: DEB Package (Ubuntu/Debian)
```bash
# Install DEB package
sudo dpkg -i bonus-cards_1.0.0_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Launch from applications menu or command line
bonus-cards
```

#### Installation Locations (DEB)
- Application: `/opt/FTG Sportfabrik Bonus Cards/`
- User Data: `~/.config/bonus-cards/`
- Desktop File: `/usr/share/applications/bonus-cards.desktop`

## Configuration System

### Configuration File Location

The application stores its configuration outside the bundled code for easy management:

**Windows:**
```
C:\Users\{username}\AppData\Roaming\bonus-cards\config.json
```

**Linux:**
```
~/.config/bonus-cards/config.json
```

### Configuration Options

Create or edit the `config.json` file with the following structure:

```json
{
  "DESKTOP_API_BASE_URL": "https://api.ftg-sportfabrik.de",
  "EMAIL_DRY_RUN": false,
  "UI_LOCALE": "de",
  "LOG_LEVEL": "info"
}
```

#### Configuration Keys

| Key | Description | Default | Valid Values |
|-----|-------------|---------|--------------|
| `DESKTOP_API_BASE_URL` | URL of the bonus cards API server | `http://localhost:3000` | Any valid HTTP/HTTPS URL |
| `EMAIL_DRY_RUN` | Email testing mode (true = no real emails sent) | `true` | `true`, `false` |
| `UI_LOCALE` | User interface language | `de` | `de` (German), `en` (English) |
| `LOG_LEVEL` | Application logging verbosity | `info` | `error`, `warn`, `info`, `debug` |

### Sample Production Configuration

```json
{
  "_comment": "FTG Sportfabrik Bonus Cards - Production Configuration",
  "DESKTOP_API_BASE_URL": "https://api.ftg-sportfabrik.de",
  "EMAIL_DRY_RUN": false,
  "UI_LOCALE": "de",
  "LOG_LEVEL": "info"
}
```

### Configuration Management

1. **Initial Setup:**
   - Application creates default config file on first launch
   - Edit config.json before first launch for custom settings

2. **Production Deployment:**
   - Copy production config.json to user data directory
   - Set appropriate permissions (readable by application user)

3. **Configuration Validation:**
   - Application validates config on startup
   - Invalid values fall back to defaults
   - Validation errors are logged

## Log Files

### Log File Locations

**Windows:**
```
C:\Users\{username}\AppData\Roaming\bonus-cards\logs\
```

**Linux:**
```
~/.config/bonus-cards/logs/
```

### Log File Management

- **Naming:** `bonus-cards-YYYY-MM-DD.log`
- **Rotation:** Daily rotation, 7-day retention
- **Size Limit:** 10MB per file maximum
- **Format:** `YYYY-MM-DD HH:mm:ss.sss [LEVEL] message`

### Log Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `error` | Critical errors only | Production systems |
| `warn` | Warnings and errors | Production systems |
| `info` | General information | Default setting |
| `debug` | Detailed debugging | Development/troubleshooting |

## Troubleshooting Installation

### Windows Common Issues

1. **MSI Installation Fails**
   ```cmd
   # Check Windows Installer service
   sc query msiserver
   
   # Start if stopped
   net start msiserver
   ```

2. **Application Won't Start**
   - Check Windows Event Viewer for application errors
   - Verify .NET Framework 4.7.2+ is installed
   - Check user permissions for AppData directory

3. **Configuration Issues**
   - Delete config.json to reset to defaults
   - Check JSON syntax with online validator
   - Verify API URL accessibility

### Linux Common Issues

1. **AppImage Won't Execute**
   ```bash
   # Check execution permissions
   ls -la bonus-cards-*.AppImage
   
   # Make executable
   chmod +x bonus-cards-*.AppImage
   
   # Check FUSE support (required for AppImage)
   which fusermount
   ```

2. **DEB Installation Fails**
   ```bash
   # Check for dependency issues
   sudo apt-get install -f
   
   # Force install if needed (use with caution)
   sudo dpkg -i --force-depends bonus-cards_*.deb
   ```

3. **Missing Desktop Integration**
   ```bash
   # Manually install desktop file (if needed)
   sudo cp /opt/FTG\ Sportfabrik\ Bonus\ Cards/bonus-cards.desktop /usr/share/applications/
   sudo update-desktop-database
   ```

## Network Configuration

### Firewall Rules

Ensure the following outbound connections are allowed:

| Purpose | Destination | Port | Protocol |
|---------|-------------|------|----------|
| API Access | api.ftg-sportfabrik.de | 443 | HTTPS |
| Update Check | api.github.com | 443 | HTTPS |
| SMTP Email (if enabled) | SMTP server | 587/465 | TLS |

### Proxy Configuration

If using a corporate proxy, configure system proxy settings:

**Windows:**
- Configure via Internet Options > Connections > LAN Settings
- Or use system environment variables

**Linux:**
```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,.local
```

## Security Considerations

### Application Security

1. **Code Signing:**
   - Production builds should be code-signed
   - Verify signatures before deployment

2. **User Permissions:**
   - Application runs with standard user privileges
   - No administrative rights required for normal operation

3. **Data Protection:**
   - Configuration and logs stored in user profile
   - No sensitive data in system-wide locations

### Network Security

1. **API Communication:**
   - All API communication over HTTPS
   - Certificate validation enabled

2. **Update Mechanism:**
   - Manual update checks only (no auto-update)
   - Updates from GitHub releases only

## Deployment Automation

### Silent Installation Script (Windows)

```batch
@echo off
REM Silent installation script for FTG Bonus Cards

REM Check if MSI exists
if not exist "bonus-cards-1.0.0.msi" (
    echo Error: MSI file not found
    exit /b 1
)

REM Install silently
echo Installing FTG Bonus Cards...
msiexec /i "bonus-cards-1.0.0.msi" /quiet /norestart

REM Check installation result
if %ERRORLEVEL% EQU 0 (
    echo Installation completed successfully
) else (
    echo Installation failed with error code %ERRORLEVEL%
    exit /b 1
)

REM Deploy production configuration
echo Deploying configuration...
copy "config-production.json" "%APPDATA%\bonus-cards\config.json"

echo Deployment complete!
```

### Mass Deployment (Linux)

```bash
#!/bin/bash
# Mass deployment script for FTG Bonus Cards

DEB_FILE="bonus-cards_1.0.0_amd64.deb"
CONFIG_FILE="config-production.json"

# Check prerequisites
if [ ! -f "$DEB_FILE" ]; then
    echo "Error: DEB file not found: $DEB_FILE"
    exit 1
fi

# Install package
echo "Installing FTG Bonus Cards..."
sudo dpkg -i "$DEB_FILE"
sudo apt-get install -f -y

# Deploy configuration for each user
echo "Deploying configuration..."
for USER_HOME in /home/*; do
    if [ -d "$USER_HOME" ]; then
        USER=$(basename "$USER_HOME")
        CONFIG_DIR="$USER_HOME/.config/bonus-cards"
        
        # Create config directory
        sudo -u "$USER" mkdir -p "$CONFIG_DIR"
        
        # Copy configuration
        sudo -u "$USER" cp "$CONFIG_FILE" "$CONFIG_DIR/config.json"
        
        echo "Configuration deployed for user: $USER"
    fi
done

echo "Deployment complete!"
```

## Support Information

### Version Information
- Application version is displayed in Help > About
- Configuration and log paths available in application

### Log Collection for Support
When reporting issues, collect the following files:

**Windows:**
```
%APPDATA%\bonus-cards\config.json
%APPDATA%\bonus-cards\logs\bonus-cards-YYYY-MM-DD.log
```

**Linux:**
```
~/.config/bonus-cards/config.json
~/.config/bonus-cards/logs/bonus-cards-YYYY-MM-DD.log
```

### Contact Information
- Development Team: [development team contact]
- IT Support: [IT support contact]
- System Documentation: See OPERATION.md for daily operations