# FTG Sportfabrik Digital Bonus Cards - Desktop App

Electron-based desktop application for managing digital bonus cards at FTG Sportfabrik facilities.

## Features

### 🔐 Authentication
- Staff login with username-based authentication
- Role-based access (Reception/Admin)
- Automatic role detection from API

### 📱 Reception Interface
- **Always-focused scanner input** - Ready for barcode scanning
- **Real-time card information display** - Shows customer, product, remaining visits, expiry
- **One-click confirmation** - Large "Bestätigen" button for visit deduction
- **Smart error handling** - German error messages for expired/invalid cards
- **Toast notifications** - Success/error feedback with auto-dismiss

### 🛠️ Admin Interface
- **Card search by serial number** - Find any card in the system
- **Visit rollback** - Undo mistaken deductions with reason codes
- **Card cancellation** - Permanently disable cards
- **CSV export** - Download reports for deductions, rollbacks, cancellations
- **Settings viewer** - Read-only view of application configuration

### 🔧 Technical Features
- **Idempotency protection** - Prevents duplicate scanner reads
- **Auto-focus management** - Scanner input always ready
- **Debounced scanning** - 500ms delay prevents double-reads
- **State validation** - Client-side checks for card expiry/status
- **Graceful error handling** - User-friendly German error messages

## Quick Start

### Prerequisites
- Node.js 18+
- Backend API server running on `http://localhost:3000`
- Valid staff account in the system

### Installation & Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env to point to your API server
   ```

3. **Start development mode:**
   ```bash
   # This starts both the API server and desktop app
   npm run dev:desktop
   ```

   Or run components separately:
   ```bash
   # Terminal 1: Start API server
   npm run dev

   # Terminal 2: Start renderer dev server
   npm run dev:renderer

   # Terminal 3: Start Electron app
   npm run desktop
   ```

### Production Build

```bash
# Build the React renderer
npm run build:renderer

# Compile Electron main process
npm run build:desktop

# Run production app
npm run desktop
```

## Environment Configuration

Create a `.env` file in the project root:

```env
# API Server URL
DESKTOP_API_BASE_URL=http://localhost:3000

# Development settings
NODE_ENV=development
ELECTRON_IS_DEV=true
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DESKTOP_API_BASE_URL` | Backend API base URL | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |
| `ELECTRON_IS_DEV` | Enable Electron dev tools | `true` |

## Scanner Configuration

### Supported Scanner Types
- **2D Imagers** (recommended)
- **1D Barcode scanners**
- **HID-mode scanners** (plug-and-play)

### Scanner Setup
1. **Configure scanner for HID mode** - Most scanners work out-of-the-box
2. **Set output format to include Enter/Return** - Automatically submits scans
3. **Test with sample barcode** - Use format: `BC-2024-12345`

### Scanner Behavior
- **Auto-focus**: Scanner input field automatically receives focus
- **Debouncing**: 500ms delay prevents duplicate reads
- **Enter key**: Triggers scan processing
- **Manual entry**: Type serial number and press Enter

## User Guide

### Reception Staff Workflow

1. **Login** with your username
2. **Scan customer's bonus card** or enter serial manually
3. **Review card information** in the right panel
4. **Click "Bestätigen"** to deduct a visit
5. **Check success message** - shows remaining visits

### Admin Workflow

1. **Login** with admin username
2. **Search for cards** by serial number
3. **Rollback visits** if needed (requires reason code)
4. **Cancel cards** for lost/damaged cards
5. **Export reports** as CSV files
6. **View settings** (read-only configuration)

## Error Handling

### Common Error Messages

| German Message | English Meaning | Resolution |
|---------------|-----------------|------------|
| "Karte ist abgelaufen" | Card has expired | Check expiry date, issue new card |
| "Keine Besuche mehr verfügbar" | No visits remaining | Card is used up |
| "Fehlende Berechtigung" | Insufficient permissions | Use admin account |
| "Karte nicht gefunden" | Card not found | Check serial number |

### Troubleshooting

**Scanner not working?**
- Check HID mode configuration
- Try manual entry with Enter key
- Restart application if input loses focus

**API connection issues?**
- Verify `DESKTOP_API_BASE_URL` in `.env`
- Check API server is running
- Test with `curl http://localhost:3000/health`

**Login failures?**
- Verify username exists in staff table
- Check staff role (reception/admin)
- Review API logs for authentication errors

## Development

### Project Structure

```
electron/
├── main.ts              # Electron main process
├── preload.ts           # IPC bridge (secure)
├── tsconfig.json        # Main process TypeScript config
└── renderer/            # React frontend
    ├── App.tsx          # Main application component
    ├── App.css          # Global styles
    ├── index.tsx        # React entry point
    ├── index.html       # HTML template
    ├── tsconfig.json    # Renderer TypeScript config
    ├── components/      # Reusable UI components
    │   ├── CardPanel.tsx
    │   ├── ScanInput.tsx
    │   └── Toast.tsx
    ├── screens/         # Main application screens
    │   ├── Login.tsx
    │   ├── Reception.tsx
    │   └── Admin.tsx
    ├── lib/             # Utilities and API client
    │   ├── api.ts
    │   └── idempotency.ts
    └── types/           # TypeScript type definitions
        └── global.d.ts
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:desktop` | Full development environment |
| `npm run dev:renderer` | Renderer development server only |
| `npm run build:renderer` | Build React frontend |
| `npm run build:desktop` | Compile Electron main process |
| `npm run desktop` | Run Electron app |
| `npm test` | Run Jest tests |

### API Integration

The desktop app communicates with the backend API using:

- **Authentication**: `x-staff-username` header
- **Idempotency**: `x-idempotency-key` header (auto-generated UUIDs)
- **Error handling**: Graceful German error messages
- **Endpoints used**:
  - `GET /health` - Health check
  - `GET /staff/:username` - Login verification
  - `GET /admin/search?serial=...` - Card search
  - `POST /cards/:id/deduct` - Visit deduction
  - `POST /admin/:id/rollback` - Visit rollback
  - `POST /admin/:id/cancel` - Card cancellation
  - `GET /admin/reports/:type` - CSV exports

### Testing

Run the smoke tests:

```bash
# Build the app first
npm run build:renderer
npm run build:desktop

# Run Playwright tests
npx playwright test
```

### Building for Distribution

```bash
# Build all components
npm run build:renderer
npm run build:desktop

# Package with electron-builder (when ready)
npm run dist
```

## Security Considerations

- **No sensitive data storage** - All authentication via API
- **Context isolation** - Renderer process isolated from Node.js
- **IPC restrictions** - Limited API surface in preload script
- **URL restrictions** - No external navigation allowed

## Support

For technical issues:
1. Check console logs in DevTools (F12)
2. Review API server logs
3. Verify network connectivity
4. Test with manual API calls

## License

Proprietary - FTG Sportfabrik Internal Use Only