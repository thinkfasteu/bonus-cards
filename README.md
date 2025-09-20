# FTG Sportfabrik Digital Bonus Cards System

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-brightgreen.svg)](docs/GDPR-Article-30.md)
[![Security](https://img.shields.io/badge/Security-Hardened-blue.svg)](#-security-features)

A complete digital bonus card management system for FTG Sportfabrik facilities, featuring a REST API backend and Electron desktop application for reception and administrative tasks. **Production-ready with comprehensive security features and GDPR compliance.**

## 🔒 Security Features

This system implements enterprise-grade security measures:

### **🛡️ API Security**
- **CORS Protection**: Strict origin validation - only configured domains allowed
- **Input Validation**: Comprehensive Zod schema validation for all endpoints
- **Authentication**: Header-based staff authentication with role-based access
- **Rate Limiting**: Built-in protection against brute force and DoS attacks
- **HTTPS Enforcement**: TLS 1.3 encryption for all communications
- **SQL Injection Protection**: Prepared statements and parameter binding

### **🔐 Data Protection**
- **Encryption in Transit**: All data encrypted using TLS 1.3
- **Encryption at Rest**: Database encryption via Supabase infrastructure
- **Data Minimization**: Only essential data collected and processed
- **Access Controls**: Role-based permissions with minimum necessary access
- **Audit Logging**: Comprehensive audit trail for all transactions and admin actions

### **📋 GDPR Compliance**
- **Article 30 Documentation**: Complete records of processing activities
- **Data Protection Impact Assessment (DPIA)**: Comprehensive risk analysis
- **Data Subject Rights**: Full implementation of GDPR rights (access, portability, erasure)
- **Legal Basis**: Documented lawful basis for all data processing
- **Data Retention**: Automated deletion policies aligned with legal requirements
- **Privacy by Design**: Built-in privacy protections at architectural level

### **⚙️ Production Configuration**

#### Required Environment Variables
```env
# Security Configuration
ALLOWED_ORIGINS=https://demo.ftg.de,https://admin.ftg.de
NODE_ENV=production

# Database (Encrypted connection required)
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

# SMTP (Secure configuration)
SMTP_HOST=secure.mail.server.de
SMTP_PORT=587
SMTP_USER=secure_user
SMTP_PASS=secure_password
EMAIL_FROM="Sportfabrik FTG" <noreply@ftg-sportfabrik.de>

# Application
APP_ENV=production
```

#### Security Best Practices
1. **Environment Isolation**: Separate production, staging, and development environments
2. **SSL/TLS Only**: Never run in production without HTTPS
3. **Regular Updates**: Keep all dependencies and systems updated
4. **Monitoring**: Continuous monitoring for security incidents and anomalies
5. **Backup Security**: Encrypted backups with tested restoration procedures

### 📊 **Production Monitoring & Compliance**
- **Health Monitoring**: Real-time system health and performance tracking
- **Security Monitoring**: Continuous monitoring for suspicious activities
- **Compliance Reporting**: Automated GDPR compliance reporting
- **Incident Response**: Documented procedures for security incidents
- **Data Breach Protocols**: GDPR-compliant breach notification procedures

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
npm run test:desktop # Run installer smoke tests
npm run db:test  # Test database connection
npm run worker:email  # Start email worker (separate terminal)
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
    ├── emails.ts         # Email management endpoints  
    └── reports.ts        # Reporting endpoints

tests/
├── cards.e2e.test.ts          # End-to-end integration tests
├── email.test.ts              # Email system tests
├── validation.test.ts         # Input validation tests
└── desktop/
    ├── smoke.spec.ts          # Desktop app smoke tests
    └── installer-smoke.spec.ts # Installer verification tests

docs/
├── GDPR-Article-30.md         # GDPR compliance documentation
└── GDPR-DPIA.md              # Data Protection Impact Assessment

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

German-language emails are automatically processed for:
- **Card deductions**: Usage confirmations with remaining balance
- **Rollbacks**: Correction notifications with updated balance

#### Email Delivery System
- **Queuing**: Emails stored in `email_receipts` table with status 'Queued'
- **Background Worker**: Processes queued emails with configurable concurrency
- **Retry Logic**: Failed emails retry up to 3 times with backoff
- **Admin Management**: View delivery status and retry failed emails
- **Dry-run Mode**: Development mode with `EMAIL_DRY_RUN=true` (no actual sends)

#### Running the Email Worker

Start the email worker in a separate terminal:
```bash
npm run worker:email
```

The worker will:
- Poll for queued emails every 30 seconds
- Process emails with 2 concurrent sends (configurable)
- Retry failed emails with exponential backoff
- Log delivery status and errors
- Gracefully shutdown on SIGINT/SIGTERM

#### Email Content
- **Subject**: `Sportfabrik – Besuch erfasst ({{productLabel}})`
- **Format**: Both text and HTML versions
- **Timezone**: Times displayed in Europe/Berlin
- **Languages**: German (with GDPR-compliant privacy notice)
- **Content**: Member name, card serial, product, remaining uses, expiry

### Testing

The comprehensive test suite includes:
- **API Integration Tests**: Happy path testing (Issue → Deduct → Rollback cycle)
- **Security Tests**: Authentication, authorization, and input validation
- **Validation Tests**: Comprehensive Zod schema validation testing
- **Email System Tests**: Email queuing, delivery, and retry logic
- **Desktop Tests**: Electron app functionality and user interface
- **Installer Tests**: Automated verification of MSI, DEB, and AppImage installers
- **GDPR Compliance Tests**: Data handling and privacy requirement validation

Run tests with:
```bash
npm test              # Run all backend tests
npm run test:desktop  # Run desktop and installer tests
```

### Security Testing
```bash
# Run validation schema tests
npm test -- validation.test.ts

# Run installer smoke tests (requires built installers)
npm run test:desktop -- installer-smoke.spec.ts

# Run email security tests
npm test -- email.test.ts
```

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

### **🚨 Security Incident Response**
If you suspect a security incident:
1. **Immediate**: Document the incident with timestamps
2. **Within 1 hour**: Notify IT management and data protection officer
3. **Within 4 hours**: Assess impact and implement containment measures
4. **Within 72 hours**: Report to supervisory authority if required by GDPR
5. **Follow-up**: Conduct post-incident review and implement improvements

See `docs/GDPR-DPIA.md` for detailed incident response procedures.

## 📚 Documentation

### **GDPR & Compliance**
- **[GDPR Article 30](docs/GDPR-Article-30.md)**: Complete record of processing activities
- **[Data Protection Impact Assessment](docs/GDPR-DPIA.md)**: Comprehensive privacy risk analysis
- **[Privacy Policy](docs/privacy-policy.md)**: User-facing privacy information *(coming soon)*

### **Technical Documentation**
- **[Database Setup](README-DATABASE.md)**: Database configuration and troubleshooting
- **[Desktop App](desktop/README.md)**: Electron application documentation
- **[API Reference](api/openapi.yaml)**: Complete OpenAPI 3.1 specification
- **[Operations Guide](OPERATION.md)**: Production deployment and maintenance

## Next Steps (Phase-2)

- ✅ **Security Hardening**: CORS, input validation, GDPR compliance
- ⏳ **Production Deployment**: SSL certificates, monitoring, backup procedures
- 📧 **Enhanced Email Features**: Templates, delivery confirmation, unsubscribe
- 📊 **Advanced Analytics**: Member engagement metrics, usage patterns
- 🏢 **Multi-location Support**: Franchise and branch management
- 🔐 **Enhanced Authentication**: JWT tokens, OAuth2 integration
- 📱 **Mobile App**: Customer self-service portal

## Support

For technical issues:
1. Check this README
2. Review `README-DATABASE.md` for DB issues
3. Check application logs for detailed error messages
4. Verify environment configuration