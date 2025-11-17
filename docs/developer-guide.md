# Developer Guide - Mini Ola Backend

This guide is for developers working on the backend codebase. It includes setup steps, development scripts, testing, and guidelines for adding features.

## Repository Layout
```
mini-ola-backend/
├── src/
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── scripts/        # Data migration/utility scripts
├── __tests__/       # Jest test suites
├── package.json
├── jest.config.js
```

## Requirements
- Node.js 18+ (LTS recommended)
- MongoDB (locally or Atlas). Tests use `mini-ola-test` by default

## Environment Variables
Create a `.env` file in `mini-ola-backend/` with:
```env
MONGODB_URI=mongodb://localhost:27017/mini-ola-test
JWT_SECRET=super-secret-key-32-chars-or-longer
JWT_EXPIRES_IN=15m
REFRESH_TTL_MINUTES=10080
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
BASE_FARE_BIKE=30
BASE_FARE_MINI=50
BASE_FARE_SEDAN=80
BASE_FARE_SUV=120
FARE_PER_KM=12
FARE_PER_MINUTE=2
```

## Running Locally
```bash
# Install deps
cd mini-ola-backend
npm ci

# Run in development mode
npm run dev
# or to run normally
npm start
```

Server starts on `PORT` and exposes routes under `/api`.

## Database
- Use MongoDB Atlas or local MongoDB
- For tests, environment `NODE_ENV=test` is used and a test DB `mini-ola-test` is expected

## Scripts
- `npm run dev` - nodemon server
- `npm start` - production start
- `npm test` - run tests (uses cross-env to set NODE_ENV=test)
- `scripts/*` - helper scripts for migrations and seeding

## How to add a new API endpoint
1. Add controller function in `src/controllers/<resource>Controller.js`.
2. Add routes in `src/routes/<resource>Routes.js` and wire to `server.js`.
3. Add route-level `authenticate` middleware & input validation (`middleware/validator.js`) as needed.
4. Add model changes in `src/models/` if required, with index and pre-save hooks.
5. Add unit/integration tests to `__tests__/`.
6. Update `docs/api.md` with the new endpoint.

## Testing
- Tests are written using Jest & SuperTest
- Run all tests:
```bash
cd mini-ola-backend
npm test
```
- Run with coverage:
```bash
npm test -- --coverage
```
- Use `--testNamePattern` to run specific tests

## Code Quality
- Keep controllers thin; put logic into services when complex
- Always validate inputs with `express-validator` and `validate` middleware
- Use `asyncHandler` wrapper to catch async errors
- Standard response format: `formatSuccess` and `formatError`

## Authentication and Role-Based Access
- Use `authenticate` middleware to protect routes
- Use `authorize('driver', 'admin')` for role-based restrictions
- Use `optionalAuth` where token is optional

## Security Notes
- Hash passwords with `bcryptjs` (pre-save hooks exist)
- Rotate refresh tokens (tokenService.js)
- Ensure JWT secret length and proper storage (use secrets manager in CI)

## CI/CD
- GitHub Actions pipeline: `.github/workflows/ci-cd.yml` runs lint, tests, coverage, build and optional deploy
- Coverage artifacts are uploaded to the `coverage` job and optionally to codecov

## Debugging Tips
- For geospatial queries, ensure 2dsphere indexes are created. The app creates driver index on server startup.
- When a query fails due to index not ready, there are fallbacks implemented (manual Haversine distance calculations)
- Use `GET /health` to confirm server is running

## Contributing
- Create a feature branch from `develop` (e.g., `feature/my-change`)
- Run tests locally before pushing
- Create PR and ensure CI passes

---

## Important Files
- `src/server.js` - app entry and route mounting
- `src/config/database.js` - DB connection
- `src/models` - Mongoose models
- `src/controllers` - Business logic
- `src/utils/helpers.js` - Formatting helpers and token helper wrappers
- `src/utils/fareCalculator.js` - Fare logic

---

## Quick Troubleshooting Commands
```bash
# Check running server logs
tail -f logs/server.log

# Remove dev dependencies and reinstall
npm ci

# Run tests with extended timeout
npm test -- --testTimeout=60000

# Run a single test file
npm test -- __tests__/driverMethods.test.js
```

---

If you'd like, I can add code samples or example Postman collection next to these docs, or add automated generation of API docs from routes (Swagger/OpenAPI).