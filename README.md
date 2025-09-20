# FTG Sportfabrik Digital Bonus Cards System

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

A complete digital bonus card management system for FTG Sportfabrik facilities, featuring a REST API backend and Electron desktop application for reception and administrative tasks.

## 🏗️ System Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Electron Desktop  │    │    Express API      │    │  Supabase Postgres  │
│                     │◄───┤                     │◄───┤                     │
│ • Reception UI      │    │ • Authentication    │    │ • Cards & Members   │
│ • Admin Console     │    │ • Business Logic    │    │ • Event Logging     │
│ • Scanner Support   │    │ • Data Validation   │    │ • Configuration     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## 🚀 Features

### 📱 **Desktop Application (Electron + React + TypeScript)**
- **Staff Authentication**: Username-based login with role detection  
- **Reception Interface**: Scanner-optimized UI for visit deductions
- **Admin Console**: Card management, rollbacks, and reporting
- **Real-time Validation**: Client-side state checks with server authority
- **German Localization**: User-friendly error messages and interface

### 🔧 **REST API Backend (Express + TypeScript)**

- **Digital Card Management**: Issue, track, and manage cycling bonus cards
- **Two Product Types**: 
  - `cycling_bonus`: 11 uses, expires after configurable months
  - `cycling_unlimited`: Unlimited uses, expires end of calendar month
- **Staff Authentication**: Role-based access (reception, admin)
- **Transaction Tracking**: Complete audit trail of all card activities
- **Email Notifications**: Automated German-language confirmations (queued for SMTP)
- **CSV Reports**: Administrative transaction exports
- **State Management**: Active, Expired, UsedUp, Cancelled states with enforced transitions

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase)
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Verify database connection
npm run db:test

# Start development server
npm run dev

# Run tests
npm test
```

## Environment Setup

### 1. .env Configuration

Create `.env` in project root:

```env
# Database (Supabase Session pooler)
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

# SMTP (placeholders for Phase-2)
SMTP_HOST=SMTP_PLACEHOLDER
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Sportfabrik FTG" <noreply@sportfabrik-ftg.de>

# App
APP_ENV=development
```

**Important**: Use the **Session pooler** URI (port 6543), not direct connection. URL-encode special characters in passwords.

### 2. Database Setup

The database should already be configured with these tables:
- `members` - Member information
- `staff` - Staff authentication and roles
- `cards` - Bonus cards
- `events` - Transaction audit trail
- `email_receipts` - Email queue
- `app_config` - Application configuration

If you need to run migrations again, see `README-DATABASE.md`.

## API Usage

### Authentication

All endpoints require the `x-staff-username` header:

```bash
curl -H "x-staff-username: your_staff_username" ...
```

### Available Endpoints

#### System
- `GET /health` - Health check and database connectivity

#### Cards (Reception + Admin)
- `POST /cards` - Issue new bonus card
- `GET /cards/{cardId}` - Get card details
- `POST /cards/{cardId}/deduct` - Deduct card usage

#### Admin Only
- `POST /cards/{cardId}/rollback` - Rollback last deduction
- `POST /cards/{cardId}/cancel` - Cancel card
- `GET /reports/transactions` - Export CSV transaction report

### Example API Calls

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Issue Cycling Bonus Card
```bash
curl -X POST http://localhost:3000/cards \\
  -H "Content-Type: application/json" \\
  -H "x-staff-username: reception_user" \\
  -d '{
    "memberId": "123e4567-e89b-12d3-a456-426614174000",
    "product": "cycling_bonus"
  }'
```

#### Get Card Details
```bash
curl http://localhost:3000/cards/456e7890-e12c-34d5-b678-901234567890 \\
  -H "x-staff-username: reception_user"
```

#### Deduct Card Usage
```bash
curl -X POST http://localhost:3000/cards/456e7890-e12c-34d5-b678-901234567890/deduct \\
  -H "Content-Type: application/json" \\
  -H "x-staff-username: reception_user" \\
  -d '{"confirm": true}'
```

#### Rollback (Admin Only)
```bash
curl -X POST http://localhost:3000/cards/456e7890-e12c-34d5-b678-901234567890/rollback \\
  -H "Content-Type: application/json" \\
  -H "x-staff-username: admin_user" \\
  -d '{
    "reasonCode": "MISTAKE",
    "note": "Customer was charged twice"
  }'
```

#### Transaction Report (Admin Only)
```bash
curl "http://localhost:3000/reports/transactions?from=2025-01-01T00:00:00.000Z&to=2025-12-31T23:59:59.999Z" \\
  -H "x-staff-username: admin_user" \\
  --output transactions.csv
```

## Development

### Scripts

```bash
npm run dev      # Start development server with auto-reload
npm run build    # Compile TypeScript to JavaScript
npm run start    # Start production server
npm run test     # Run Jest tests
npm run db:test  # Test database connection
```

### Project Structure

```
src/
├── server.ts              # Express app entry point
├── db.ts                  # Database connection and helpers
├── middleware/
│   ├── auth.ts           # Staff authentication
│   └── validate.ts       # Request validation (zod)
├── services/
│   ├── cards.ts          # Card business logic
│   └── email.ts          # Email queuing and templates
└── routes/
    ├── cards.ts          # Card endpoints
    ├── admin.ts          # Admin endpoints
    └── reports.ts        # Reporting endpoints

tests/
└── cards.e2e.test.ts     # End-to-end integration tests

api/
└── openapi.yaml          # OpenAPI 3.1 specification
```

### Business Rules

#### Card Issuance
- **cycling_bonus**: 11 uses, expires after 12 months (configurable)
- **cycling_unlimited**: Unlimited uses, expires end of calendar month

#### Deductions
- Requires `confirm: true` in request body (manual staff confirmation)
- Only allowed on Active cards within expiry
- cycling_bonus: decrements uses, becomes UsedUp when reaching 0
- cycling_unlimited: no use counter, always unlimited

#### Rollbacks (Admin Only)
- Reverses last deduction
- cycling_bonus: adds 1 use back (capped at 11 max)
- cycling_unlimited: logs event but no counter change
- Requires reason code: MISTAKE, FRAUD_SUSPECTED, CARD_LOST, OTHER

#### State Transitions
- **Active** → **Expired** (automatic when past expiry date)
- **Active** → **UsedUp** (when cycling_bonus reaches 0 uses)
- **Active** → **Cancelled** (admin action)
- **UsedUp** → **Active** (when rollback restores uses)

### Email Notifications

German-language emails are automatically queued for:
- Card deductions (usage confirmations)
- Rollbacks (correction notifications)

Emails are stored in `email_receipts` table with status 'Queued'. SMTP delivery will be implemented in Phase-2.

### Testing

The test suite includes:
- Happy path: Issue → Deduct → Rollback cycle
- Authentication and authorization tests
- Validation error handling
- State transition validation
- Event logging verification
- Email queuing verification

Run tests with: `npm test`

### Error Handling

- **400**: Validation errors (malformed requests)
- **401**: Authentication required (missing/invalid x-staff-username)
- **403**: Insufficient permissions (wrong role)
- **404**: Resource not found (card, member)
- **409**: Business rule violation (invalid state transitions)
- **500**: Internal server errors

## API Documentation

See `api/openapi.yaml` for complete OpenAPI 3.1 specification with schemas, examples, and detailed endpoint documentation.

## Troubleshooting

### Database Connection Issues
See `README-DATABASE.md` for detailed database setup and troubleshooting.

### Common Issues

1. **"Header x-staff-username is required"**
   - Add authentication header to all requests
   - Verify staff username exists in database with is_active=true

2. **"Cannot deduct from card in state: Expired"**
   - Check card expiry date
   - Use admin rollback if needed

3. **"Validation failed"**
   - Check request body format matches OpenAPI schema
   - Ensure UUIDs are properly formatted
   - Verify enum values (product types, reason codes)

4. **Tests failing**
   - Ensure test database is clean
   - Check that required tables exist
   - Verify DATABASE_URL points to test-safe database

## 🖥️ Desktop Application

The system includes a complete Electron desktop application for staff use.

### Desktop Features

#### **🔐 Login Screen**
- Username-based authentication
- Automatic role detection (reception/admin)
- Real-time validation with server

#### **📱 Reception Interface**
- **Scanner Integration**: Built-in barcode/QR code scanning for physical cards
- **Card Lookup**: Manual card ID input as fallback
- **One-Click Operations**: Streamlined deduction workflow
- **Real-Time Feedback**: Instant validation and user-friendly German messages
- **Card State Display**: Shows remaining uses, expiry, and current status

#### **⚙️ Admin Console**
- **Card Management**: Issue new cards with product selection
- **Error Correction**: Rollback functionality with reason codes
- **Transaction History**: View detailed audit trail
- **Bulk Operations**: Efficient management of multiple cards

### Desktop Installation & Usage

```bash
# Install desktop dependencies
npm install

# Start desktop app in development
npm run desktop:dev

# Build desktop app for production
npm run desktop:build

# Package desktop app (creates distributable)
npm run desktop:package
```

### Desktop Development

The desktop app is built with:
- **Electron**: Native desktop wrapper
- **React + TypeScript**: Frontend framework with type safety
- **Webpack**: Module bundling and hot reload
- **CSS Modules**: Scoped styling for components

```
electron/
├── main.ts                    # Electron main process
├── preload.ts                 # Context bridge for security
├── renderer/
│   ├── App.tsx               # Main React application
│   ├── screens/
│   │   ├── Login.tsx         # Authentication screen
│   │   ├── Reception.tsx     # Reception interface
│   │   └── Admin.tsx         # Admin console
│   ├── components/
│   │   ├── CardPanel.tsx     # Card display component
│   │   ├── ScanInput.tsx     # Scanner input component
│   │   └── Toast.tsx         # Notification component
│   └── lib/
│       ├── api.ts            # API client wrapper
│       └── idempotency.ts    # Request deduplication
```

See `desktop/README.md` for detailed desktop app documentation.

## Next Steps (Phase-2)

- SMTP email delivery implementation  
- Enhanced reporting and analytics
- Card design and printing integration
- Advanced authentication (JWT/OAuth)
- Multi-location support

## Support

For technical issues:
1. Check this README
2. Review `README-DATABASE.md` for DB issues
3. Check application logs for detailed error messages
4. Verify environment configuration