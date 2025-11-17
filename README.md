# A cab aggregator system

**Project ID:** P14  
**Course:** UE23CS341A  
**Academic Year:** 2025  
**Semester:** 5th Sem  
**Campus:** EC  
**Branch:** CSE  
**Section:** C  
**Team:** Meta Mobility

## 📋 Project Description

A OLA/Uber kind of app

This repository contains the source code and documentation for the A cab aggregator system project, developed as part of the UE23CS341A course at PES University.

## 🧑‍💻 Development Team (Meta Mobility)

- [@Devraj-nk](https://github.com/Devraj-nk) - Scrum Master
- [@chethans2005](https://github.com/chethans2005) - Developer Team
- [@chin123k](https://github.com/chin123k) - Developer Team
- [@christananda](https://github.com/christananda) - Developer Team

## 👨‍🏫 Teaching Assistant

- [@nikitha-0704](https://github.com/nikitha-0704)
- [@samwilson129](https://github.com/samwilson129)
- [@harshamogra](https://github.com/harshamogra)

## 👨‍⚖️ Faculty Supervisor

- [@sudeeparoydey](https://github.com/sudeeparoydey)


## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB installation
- npm or yarn package manager
- Git

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/pestechnology/PESU_EC_CSE_C_P14_A_cab_aggregator_system_Meta-Mobility.git
   cd PESU_EC_CSE_C_P14_A_cab_aggregator_system_Meta-Mobility
   ```

2. Install dependencies
   ```bash
   # Install backend dependencies
   cd mini-ola-backend
   npm install
   
   # Install frontend dependencies
   cd ../mini-ola-frontend
   npm install
   ```

3. Configure environment variables
   ```bash
   # Create .env file in mini-ola-backend directory
   cd mini-ola-backend
   
   # Create a new .env file and add the following variables:
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-secret-key-min-32-chars
   JWT_EXPIRES_IN=7d
   PORT=5000
   NODE_ENV=development
   ```

4. Run the application
   ```bash
   # Run backend (from mini-ola-backend directory)
   npm run dev
   
   # Run frontend (from mini-ola-frontend directory)
   npm run dev
   ```

## 📁 Project Structure

```
PESU_EC_CSE_C_P14_A_cab_aggregator_system_Meta-Mobility/
├── mini-ola-backend/    # Backend Node.js/Express API
│   ├── src/
│   │   ├── config/      # Database and app configuration
│   │   ├── controllers/ # Business logic (auth, rides, drivers, payments)
│   │   ├── middleware/  # Auth, validation, error handling
│   │   ├── models/      # Mongoose schemas (User, Driver, Ride, Payment)
│   │   ├── routes/      # API route definitions
│   │   ├── services/    # Business services
│   │   └── utils/       # Helper functions
│   ├── __tests__/       # Jest test suites
│   ├── scripts/         # Database migration scripts
│   ├── coverage/        # Test coverage reports
│   ├── .env             # Environment variables (create this - not in repo)
│   ├── jest.config.js   # Jest configuration
│   └── package.json     # Backend dependencies
├── mini-ola-frontend/   # Frontend React + Vite application
│   ├── src/
│   │   ├── api/         # API integration layer
│   │   ├── components/  # React components
│   │   ├── context/     # React context providers
│   │   ├── pages/       # Page components
│   │   └── App.jsx      # Main app component
│   ├── coverage/        # Test coverage reports
│   ├── vite.config.js   # Vite configuration
│   ├── tailwind.config.js # Tailwind CSS configuration
│   └── package.json     # Frontend dependencies
├── README.md            # This file
├── srs.txt              # Software Requirements Specification
└── test-suite-report.csv # Test coverage report
```

## 🛠️ Development Guidelines

### Branching Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Commit Messages
Follow conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test-related changes

### Code Review Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Create Pull Request to `develop`
4. Request review from team members
5. Merge after approval

## 📚 Documentation

- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)

## 🧪 Testing

### Backend Tests
```bash
cd mini-ola-backend

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.js

# Run tests in watch mode
npm test -- --watch
```

**Test Coverage:** 93.51% overall (14 test suites, 157 tests passing)

### Frontend Tests
```bash
cd mini-ola-frontend

# Run tests with coverage
npm test
```

## 📄 License

This project is developed for educational purposes as part of the PES University UE23CS341A curriculum.

---

**Course:** UE23CS341A  
**Institution:** PES University  
**Academic Year:** 2025  
**Semester:** 5th Sem
