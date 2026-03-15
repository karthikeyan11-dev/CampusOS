# 🏫 CampusOS — AI Powered Smart Campus Management Platform

A comprehensive, production-grade Smart Campus Platform built for real-world college workflows. Features academic notifications, anonymous grievance system, lost & found, resource booking, digital gate pass with QR verification, and role-based access control.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **npm** >= 9.x

### 1. Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE campusos;"

# Install btree_gist extension (needed for booking overlap prevention)
psql -U postgres -d campusos -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and API keys

# Run database migration
npm run migrate

# Seed initial data (departments, admin user, sample resources)
npm run seed

# Start development server
npm run dev
```

Backend runs at: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:3000`

### 4. Default Login

```
Email:    admin@campusos.edu
Password: admin123
```

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────┐
│  Next.js Client │────▶│  Express.js API   │────▶│ PostgreSQL │
│  (React + TS)   │     │  (Node.js)        │     │ Database   │
└─────────────────┘     └──────────────────┘     └────────────┘
                              │
                        ┌─────┴─────┐
                        │  GROQ AI  │
                        │  Service  │
                        └───────────┘
```

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, TypeScript, TailwindCSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | JWT (Access + Refresh Tokens), RBAC |
| AI | GROQ API (LLaMA 3.3 70B) |
| QR | qrcode + JWT-signed tokens |
| Email | Nodemailer |
| SMS | Twilio (configurable) |

## 🛡️ System Roles (RBAC)

| Role | Capabilities |
|------|-------------|
| **Super Admin** | Full system control, department management, analytics |
| **HOD** | Department management, approve gate passes & bookings |
| **Faculty** | Approve student passes, post notifications, book resources |
| **Student** | View notifications, submit complaints, request gate passes |
| **Security** | Scan QR gate passes, manage entry/exit |
| **Maintenance** | Handle maintenance complaints, update resolution |

## 🧩 Core Modules

### 1. 📢 Smart Notification Hub
- AI-summarized announcements (GROQ API)
- Targeted delivery (department, batch, class, hostellers)
- Approval workflow for faculty posts
- Expiry dates, pinning, read tracking

### 2. 📋 Anonymous Grievance System
- Anonymous or identified complaints
- AI classification (category, priority, sentiment)
- SLA-based auto-escalation
- Comment threads and resolution tracking

### 3. 🔍 Lost & Found Board
- Report lost/found items with photos
- Text-based smart matching
- Resolution workflow
- Campus-wide notifications

### 4. 📅 Resource Booking
- Seminar halls, labs, projectors
- Calendar availability view
- Race-condition prevention (DB transactions)
- QR confirmation codes

### 5. 🚪 Digital Gate Pass
- Multi-level approval (Student → Faculty → HOD)
- JWT-signed QR codes
- Security scanning (exit/return)
- Auto-expiry after 1 hour
- Parent SMS notifications
- Late return alerts

### 6. 📊 Analytics Dashboard
- Complaints by category/status
- Gate pass statistics
- Resource utilization
- Audit log viewer

## 📡 API Endpoints

### Auth
```
POST   /api/auth/register        # Register user
POST   /api/auth/login            # Login
POST   /api/auth/refresh          # Refresh token
POST   /api/auth/logout           # Logout
GET    /api/auth/me               # Get profile
GET    /api/auth/users/pending    # Pending registrations
PATCH  /api/auth/users/:id/approve # Approve/reject user
```

### Notifications
```
POST   /api/notifications         # Create notification
GET    /api/notifications         # List (with filters)
GET    /api/notifications/pending # Pending approvals
GET    /api/notifications/:id     # Detail view
PATCH  /api/notifications/:id/approve # Approve/reject
```

### Complaints
```
POST   /api/complaints            # Submit complaint
GET    /api/complaints            # List (with filters)
GET    /api/complaints/:id        # Detail + comments
PATCH  /api/complaints/:id/status # Update status
POST   /api/complaints/:id/comments # Add comment
```

### Gate Pass
```
POST   /api/gatepass/request      # Request pass
GET    /api/gatepass              # List passes
GET    /api/gatepass/:id          # Detail view
PATCH  /api/gatepass/:id/approve  # Approve/reject
POST   /api/gatepass/scan         # Scan QR (security)
```

### Resources
```
GET    /api/resources             # List resources
POST   /api/resources             # Create resource
POST   /api/resources/book        # Book resource
GET    /api/resources/bookings    # List bookings
GET    /api/resources/:id/availability # Calendar
PATCH  /api/resources/bookings/:id/approve # Approve
```

### Lost & Found
```
POST   /api/lostfound             # Report item
GET    /api/lostfound             # List items
GET    /api/lostfound/:id         # Detail + matches
PATCH  /api/lostfound/:id/resolve # Resolve item
```

### Analytics
```
GET    /api/analytics/dashboard   # Dashboard stats
GET    /api/analytics/audit-logs  # Audit log viewer
```

### Departments
```
GET    /api/departments           # List departments
POST   /api/departments           # Create department
PATCH  /api/departments/:id       # Update department
GET    /api/departments/:id/classes # Department classes
```

## 🔐 Security

- JWT Access + Refresh Token authentication
- RBAC authorization with permission matrix
- Input validation (Joi schemas)
- Rate limiting (express-rate-limit)
- File upload protection (MIME type + size)
- SQL injection prevention (parameterized queries)
- XSS protection (Helmet.js)
- CORS configuration
- Audit logging of all actions
- Password hashing (bcrypt, 12 rounds)

## 🤖 AI Integration

Uses **GROQ API** with **LLaMA 3.3 70B** model for:
- **Notification Summarization**: Auto-generates concise push notification summaries
- **Complaint Classification**: AI detects category, priority, and sentiment
- **Sentiment Analysis**: Understands complaint urgency

Gracefully degrades when API key is not configured (uses fallback values).

## 📱 Deployment

### Frontend (Vercel)
```bash
cd frontend
npx vercel --prod
```

### Backend (Railway / Render / VPS)
```bash
cd backend
# Set environment variables
npm start
```

### Database
Use **Supabase**, **Railway**, or **Neon** for managed PostgreSQL.

---

## 📁 Project Structure

```
CampusOS/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, env, constants
│   │   ├── middleware/       # Auth, RBAC, validation, audit, upload
│   │   ├── modules/         # Feature modules (auth, notifications, etc.)
│   │   ├── services/        # AI, email, SMS, QR services
│   │   ├── database/        # Migrations & seeds
│   │   └── app.js           # Express server
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── lib/             # API client, utilities
│   │   └── stores/          # Zustand state management
│   └── package.json
└── README.md
```

## 📜 License

MIT License — Built for College Hackathon 2026
