# Automated Testing Guide

## Overview

This project uses **Jest** and **Supertest** for automated API testing. All routes have comprehensive test coverage including both success (OK) and error (NG) cases.

## Test Structure

```
__tests__/
├── auth.test.js          # Authentication routes tests
├── manga.test.js         # Manga CRUD operations tests
├── tag.test.js           # Tag management tests
├── episode.test.js       # Single episode creation tests
├── episodes.test.js      # Episodes management tests
├── other-routes.test.js  # Comments, Recommend, Advertise, Menubar, Favorites
└── users.test.js         # User management tests
```

## Installation

Install test dependencies:

```bash
npm install --save-dev jest supertest
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- auth.test.js
npm test -- manga.test.js
npm test -- tag.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="should create manga"
```

## Test Coverage

Current coverage targets:
- **Lines**: 70%+
- **Functions**: 70%+
- **Branches**: 70%+
- **Statements**: 70%+

View detailed coverage report:
```bash
npm test -- --coverage --coverageReporters=html
# Open coverage/index.html in browser
```

## Test Categories

### 1. Auth Tests (`auth.test.js`)
- **Register**: User registration with validation
- **Login**: Authentication with token generation
- **Verify**: Token validation and session checking
- **Logout**: Session termination

**Total**: 20 test cases (10 OK, 10 NG)

### 2. Manga Tests (`manga.test.js`)
- **GET**: Retrieve all manga, by slug, by id, trending, search
- **POST**: Create new manga with file upload
- **PUT**: Update manga with flexible ID handling
- **DELETE**: Remove manga with validation

**Total**: 35 test cases (18 OK, 17 NG)

### 3. Tag Tests (`tag.test.js`)
- **GET**: List all tags, get by ID with field mapping
- **POST**: Create tag with dual field name support
- **PUT**: Update tag name
- **DELETE**: Remove tag with validation

**Total**: 18 test cases (9 OK, 9 NG)

### 4. Episode Tests (`episode.test.js`)
- **POST**: Create episode with multiple image uploads
- Field validation and manga lookup
- Error handling for missing manga

**Total**: 12 test cases (6 OK, 6 NG)

### 5. Episodes Tests (`episodes.test.js`)
- **GET**: List episodes, by manga, by ID, get pages
- **POST**: Create episode metadata, bulk upload pages
- **PUT/DELETE**: Update and remove episodes

**Total**: 28 test cases (15 OK, 13 NG)

### 6. Other Routes Tests (`other-routes.test.js`)

#### Comments (15 cases)
- Get comments by episode, create, moderate status, delete

#### Recommend (18 cases)
- List recommendations, create with image, update, delete

#### Advertise (16 cases)
- List ads, create with image, toggle status, update, delete

#### Menubar (16 cases)
- List menu items, create, reorder, update, delete

#### Favorites (15 cases)
- User favorites, check favorite status, top favorited manga

**Total**: 80 test cases

### 7. Users Tests (`users.test.js`)
- **GET**: List all users, get by ID (password excluded)
- **POST**: Change password with validation
- **PUT**: Update user profile
- **DELETE**: Remove user

**Total**: 14 test cases (7 OK, 7 NG)

## Common Test Patterns

### OK Cases (Success Scenarios)
```javascript
test('should create resource successfully', async () => {
  db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

  const response = await request(app)
    .post('/api/resource')
    .send({ name: 'Test' });

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('id', 1);
});
```

### NG Cases (Error Scenarios)
```javascript
test('should return 400 if field missing', async () => {
  const response = await request(app)
    .post('/api/resource')
    .send({});

  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('error');
});

test('should return 404 if not found', async () => {
  db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

  const response = await request(app).delete('/api/resource/999');

  expect(response.status).toBe(404);
});
```

## Mocking

### Database Mocking
```javascript
jest.mock('../db');

// Mock successful query
db.execute.mockResolvedValueOnce([[{ id: 1, name: 'Test' }]]);

// Mock error
db.execute.mockRejectedValueOnce(new Error('Database error'));

// Mock duplicate entry
db.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
```

### File Upload Mocking
```javascript
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req, res, next) => {
      req.file = { filename: 'test.jpg', path: '/test/test.jpg' };
      next();
    }
  });
  multer.diskStorage = () => {};
  return multer;
});
```

## Test Execution Flow

1. **beforeEach**: Clear all mocks before each test
2. **Test Setup**: Mock database responses
3. **Request**: Make HTTP request using supertest
4. **Assertions**: Verify response status, body, headers
5. **Cleanup**: Jest automatically cleans up after each test

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="should login successfully"
```

### Enable Verbose Output
```bash
npm test -- --verbose
```

### Debug in VSCode
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Best Practices

### ✅ DO
- Test both success and error cases
- Mock external dependencies (database, file system)
- Use descriptive test names
- Group related tests with `describe` blocks
- Clear mocks between tests
- Test edge cases and boundary conditions

### ❌ DON'T
- Test implementation details
- Share state between tests
- Use real database connections in unit tests
- Skip error case testing
- Commit failing tests

## Coverage Reports

After running `npm test -- --coverage`:

```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   75.23 |    68.45 |   72.11 |   75.67 |
 routes/           |   78.90 |    71.34 |   75.22 |   79.12 |
  manga.js         |   82.14 |    75.00 |   80.00 |   82.50 |
  tag.js           |   85.71 |    78.26 |   83.33 |   86.00 |
  auth.js          |   80.00 |    72.50 |   77.78 |   80.45 |
  episode.js       |   76.47 |    68.75 |   71.43 |   76.92 |
  ...              |   ...   |    ...   |   ...   |   ...   |
-------------------|---------|----------|---------|---------|
```

## Troubleshooting

### Issue: Tests Timeout
```bash
# Increase timeout
npm test -- --testTimeout=10000
```

### Issue: Module Not Found
```bash
# Clear Jest cache
npm test -- --clearCache
```

### Issue: Port Already in Use
Tests use supertest which doesn't require actual server listening. If you see port errors, ensure server.js isn't running.

## Contributing

When adding new routes:
1. Create test file in `__tests__/` directory
2. Add both OK and NG test cases
3. Update `TEST_CASES.md` documentation
4. Ensure coverage stays above 70%
5. Run tests before committing: `npm test`

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
