# Financial Tracker PWA

A modern, full-stack Progressive Web App for financial tracking built with React, Node.js, and TypeScript. Upload bank statements, automatically parse transactions, and manage your finances with a beautiful, responsive interface.

## 🚀 Features

- **📱 Progressive Web App** - Installable on mobile and desktop
- **📄 File Upload** - Support for CSV and Excel bank statements
- **🤖 Smart Parsing** - Automatic transaction detection and categorization
- **💰 Transaction Management** - View, edit, and organize transactions
- **📊 Dashboard** - Financial overview with stats and insights
- **🔔 Reminders** - Bill reminders and recurring payment tracking
- **🏷️ Categories** - Custom transaction categorization
- **🔐 Authentication** - Secure JWT-based user authentication
- **💾 JSON Storage** - Simple file-based data storage (no database required!)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   (React PWA)   │◄──►│   (Express)     │
└─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │   JSON Files    │
         │              │   (Data Store)  │
         └──────────────►└─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **React Router** for navigation
- **React Dropzone** for file uploads
- **PWA** with Workbox for offline support

### Backend
- **Node.js** with Express and TypeScript
- **JWT** authentication
- **Multer** for file upload handling
- **JSON file storage** (no database required!)
- **CSV Parser** for transaction extraction
- **Joi** for request validation

### Data Storage
- **JSON files** in `./data/` directory
- **File-based CRUD operations**
- **Automatic data persistence**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
cd financial-tracker-pwa
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env with your preferred settings (defaults work for local development)
```

### 3. Start Development Servers

```bash
# Start all services (backend + frontend)
npm run dev

# Or use the quick start script
./start.sh
```

This will start:
- **Backend API**: http://localhost:3001
- **Frontend PWA**: http://localhost:3000

### 4. Access the Application

1. Open http://localhost:3000 in your browser
2. Register a new account
3. Upload a bank statement (try the sample CSV in `sample-data/`)
4. Review and confirm parsed transactions

## 📁 Project Structure

```
financial-tracker-pwa/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── middleware/     # Express middleware
│   │   └── db/            # JSON storage connection
│   └── package.json
├── frontend/               # React PWA
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── services/      # API client
│   └── package.json
├── data/                   # JSON data files (auto-created)
│   ├── users.json
│   ├── transactions.json
│   ├── accounts.json
│   └── ...
├── sample-data/           # Sample files for testing
└── package.json          # Root package.json with scripts
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start all services
npm run dev:backend     # Start backend only
npm run dev:frontend    # Start frontend only

# Building
npm run build           # Build all services
npm run build:backend   # Build backend
npm run build:frontend  # Build frontend

# Production
npm run start           # Start production server
npm run start:backend   # Start backend production
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

#### File Upload & Parsing
- `POST /api/uploads/parse` - Upload and parse file directly
- `GET /api/uploads/parse-jobs/:id` - Get parse job status
- `POST /api/uploads/parse-jobs/:id/confirm` - Confirm parsed transactions
- `GET /api/uploads` - List user uploads

#### Data Management
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/accounts` - List accounts
- `POST /api/accounts` - Create account
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/reminders` - List reminders
- `POST /api/reminders` - Create reminder

## 📱 PWA Features

The application is a fully functional Progressive Web App:

- **Installable** - Add to home screen on mobile/desktop
- **Offline Support** - Cached resources work offline
- **Responsive** - Optimized for all screen sizes
- **Fast Loading** - Service worker caching
- **Native Feel** - App-like experience

To install:
1. Open the app in Chrome/Edge
2. Click the install button in the address bar
3. Or use "Add to Home Screen" on mobile

## 💾 Data Storage

The application uses JSON files for data storage, making it:

- **Simple** - No database setup required
- **Portable** - Easy to backup and move
- **Transparent** - Data is human-readable
- **Version Control Friendly** - Can track changes with git

### Data Files

- `users.json` - User accounts and authentication
- `accounts.json` - Financial accounts
- `transactions.json` - All transactions
- `categories.json` - Transaction categories
- `uploads.json` - File upload records
- `parseJobs.json` - File parsing jobs
- `reminders.json` - Bill reminders

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Joi
- CORS protection
- Helmet security headers
- File type validation
- File size limits

## 🚀 Deployment

### Production Environment Variables

```bash
# Data Storage
DATA_DIR=./data

# JWT
JWT_SECRET=your-production-secret
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=production
```

### Simple Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. Configure reverse proxy (nginx) for production
4. Set up SSL certificates
5. Configure monitoring and logging

## 🧪 Testing

The project includes sample data for testing:

- `sample-data/sample-transactions.csv` - Sample bank statement
- Upload this file to test the parsing functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Port conflicts** - Make sure ports 3000 and 3001 are available
2. **File permissions** - Ensure the app can write to the `data/` directory
3. **File upload fails** - Check file size (10MB limit) and type (CSV/Excel only)
4. **Data not persisting** - Check that the `data/` directory exists and is writable

### Logs

```bash
# Backend logs
cd backend && npm run dev

# Frontend logs
cd frontend && npm run dev
```

## 🎯 Benefits of JSON Storage

- **No Database Setup** - Just run `npm install && npm run dev`
- **Easy Backup** - Copy the `data/` folder
- **Portable** - Move the entire project anywhere
- **Transparent** - See exactly what data is stored
- **Version Control** - Track data changes with git
- **Perfect for Personal Use** - No concurrency issues

---

**Happy Financial Tracking! 💰**

*Simple, fast, and powerful - no database required!*