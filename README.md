# D-MoneyCare - Financial Protection Monitoring System



> 🏆 **한국사회보장정보원 ‘2025 국민행복 서비스 발굴·창업 경진대회’**  
> 한국노인인력개발원장상 수상 (2025.07)

<img width="1198" height="1364" alt="image" src="https://github.com/user-attachments/assets/473c59f2-b0c6-4d13-b5b7-8689e699ebbc" />

---

## 왜 시작했나요?
- **치매머니 문제**  
  - 2023년 기준 치매 관련 금융 피해는 **GDP 6.4 %** 규모  
  - 2050년엔 **488 조 원(≈ GDP 15 %)**까지 늘 전망  
- 단순 사기를 넘어 국가 경제에도 부담 → **선제적 보호 시스템** 필요  
  (출처: [보건복지부 보도자료](https://www.betterfuture.go.kr/front/notificationSpace/pressReleaseDetail.do?articleId=470))

---

## Overview

D-MoneyCare is a comprehensive financial protection monitoring system designed to safeguard vulnerable individuals (particularly dementia patients) from financial exploitation. The application provides real-time transaction monitoring, anomaly detection, risk assessment, and alert management for caregivers.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Library**: Radix UI components with shadcn/ui component system
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: Express sessions with PostgreSQL storage

### Project Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express API
├── shared/          # Shared TypeScript schemas and types
└── migrations/      # Database migration files
```

## Key Components

### Database Schema
- **Users**: Authentication and caregiver information
- **Patients**: Monitored individuals with risk profiles
- **Transactions**: Financial transaction records with anomaly flags
- **Alerts**: Real-time notifications for suspicious activities
- **Risk Assessments**: Periodic risk evaluations
- **Alert Settings**: Configurable notification preferences

### Core Services
1. **Anomaly Detection Service**: Machine learning-based transaction analysis
2. **Risk Profiling Service**: Multi-factor risk assessment algorithm
3. **Storage Service**: Database abstraction layer with comprehensive CRUD operations

### UI Components
- **Dashboard**: Main monitoring interface with patient cards and analytics
- **Real-time Activity**: Live transaction monitoring
- **Spending Chart**: Interactive data visualization with Recharts
- **Risk Score Breakdown**: Detailed risk factor analysis
- **Alert System**: Banner notifications and modal alerts

## Data Flow

1. **Transaction Ingestion**: Financial transactions are received and stored
2. **Anomaly Detection**: Each transaction is analyzed for suspicious patterns
3. **Risk Assessment**: Patient risk profiles are continuously updated
4. **Alert Generation**: Anomalies trigger real-time alerts to caregivers
5. **Dashboard Updates**: UI automatically refreshes with new data via polling

## External Dependencies

### Production Dependencies
- **Database**: Neon serverless PostgreSQL with connection pooling
- **UI Components**: Comprehensive Radix UI primitive library
- **Data Visualization**: Recharts for financial charts and analytics
- **Form Handling**: React Hook Form with Zod validation
- **Date Processing**: date-fns for timestamp manipulation

### Development Dependencies
- **Build Tools**: esbuild for server bundling, Vite for client
- **Type Checking**: TypeScript with strict configuration
- **Code Quality**: ESLint and Prettier (implied by project structure)

## Deployment Strategy

### Build Process
1. **Client Build**: Vite builds React app to `dist/public`
2. **Server Build**: esbuild bundles Express server to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **Development**: Vite dev server with HMR and Express middleware
- **Production**: Compiled static assets served by Express
- **Database**: Connection via `DATABASE_URL` environment variable

### Scripts
- `dev`: Development mode with file watching
- `build`: Production build for both client and server
- `start`: Production server execution
- `check`: TypeScript compilation check
- `db:push`: Database schema synchronization

## Changelog
- Jan 01,2025 ~June 29, 2025.

## User Preferences

Preferred communication style: Simple, everyday language.
