# Test Fixes Summary

## Issues Fixed

### 1. Login Test Failure ✅
**Problem:** Test expected `res.body.data.token` but the API returns `accessToken` and `refreshToken` separately.

**Fix:** Updated `tests/auth/login.test.js` to check for both tokens:
```javascript
expect(res.body.data.accessToken).toBeDefined();
expect(res.body.data.refreshToken).toBeDefined();
```

### 2. Mongoose Duplicate Index Warnings ✅
**Problem:** Both `User.js` and `Driver.js` had `unique: true` in schema field definitions AND explicit index definitions, causing duplicate index warnings.

**Fix:** Removed `unique: true` from field definitions in both models:
- `src/models/User.js` - Removed `unique: true` from `email` and `phone` fields
- `src/models/Driver.js` - Removed `unique: true` from `email` and `phone` fields

The unique indexes are still enforced through explicit `schema.index()` calls.

### 3. MongoDB Memory Server Failure ✅
**Problem:** MongoDB Memory Server was failing on Windows with `fassert() failure` error.

**Fix:** Updated `tests/helpers/testDb.js` to:
- Load `.env` file using `dotenv` to get MongoDB Atlas connection
- Use real MongoDB Atlas connection instead of MongoDB Memory Server
- Automatically switch to a test database (`mini-ola-test`) to avoid affecting production data

## Files Modified

1. `tests/auth/login.test.js` - Fixed token assertion
2. `src/models/User.js` - Removed duplicate unique constraints
3. `src/models/Driver.js` - Removed duplicate unique constraints
4. `tests/helpers/testDb.js` - Changed from Memory Server to real MongoDB Atlas

## How to Run Tests

Make sure your `.env` file contains a valid `MONGODB_URI` for MongoDB Atlas:

```bash
npm test -- --coverage --coverageDirectory=coverage
```

## Important Notes

- Tests now use your MongoDB Atlas connection with a separate test database
- The test database (`mini-ola-test`) is automatically dropped after each test suite
- Make sure you have sufficient disk space before running tests with coverage
- The changes maintain backward compatibility with your existing API
