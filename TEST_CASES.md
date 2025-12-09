# Test Cases Documentation

## Overview
This document lists all OK and NG (Not Good/Error) test cases for all API routes.

---

## 1. Auth Routes (`/api/auth`)

### POST /api/auth/register

**OK Cases:**
- ✅ Register new user with all required fields (username, email, password)
- ✅ Register user with specified role (admin/user)
- ✅ Register user without role (defaults to 'user')
- ✅ Password is hashed before storing in database

**NG Cases:**
- ❌ 400: Missing username
- ❌ 400: Missing email
- ❌ 400: Missing password
- ❌ 409: User already exists (duplicate username or email)
- ❌ 500: Database connection error

### POST /api/auth/login

**OK Cases:**
- ✅ Login with valid username and password
- ✅ Returns token, user_id, and role
- ✅ Creates session in database with 7-day expiration

**NG Cases:**
- ❌ 400: Missing username
- ❌ 400: Missing password
- ❌ 401: User not found
- ❌ 401: Invalid password (bcrypt comparison fails)
- ❌ 500: Database error

### POST /api/auth/verify

**OK Cases:**
- ✅ Verify valid active token
- ✅ Returns user_id and role for valid token

**NG Cases:**
- ❌ 400: Missing token
- ❌ 401: Token not found in database
- ❌ 401: Token expired (expires_at < current time)
- ❌ 401: Session inactive (is_active = 0)
- ❌ 500: Database error

### POST /api/auth/logout

**OK Cases:**
- ✅ Logout successfully (deletes session)
- ✅ Returns success message

**NG Cases:**
- ❌ 400: Missing token
- ❌ 404: Session not found
- ❌ 500: Database error

---

## 2. Manga Routes (`/api/manga` or `/api/mangas`)

### GET /api/manga

**OK Cases:**
- ✅ Get all manga with mapped field names (name, slug, description, background_image, tag)
- ✅ Get specific manga by slug query parameter (?slug=xxx)
- ✅ Get specific manga by id query parameter (?id=xxx)
- ✅ Parse tag_id JSON array correctly
- ✅ Return empty array if no manga found

**NG Cases:**
- ❌ 404: Manga not found when querying by slug
- ❌ 404: Manga not found when querying by id
- ❌ 500: Database error

### GET /api/manga/trending

**OK Cases:**
- ✅ Get manga sorted by view_count descending
- ✅ Returns mapped field names

**NG Cases:**
- ❌ 500: Database error

### GET /api/manga/search

**OK Cases:**
- ✅ Search manga by keyword (searches manga_name and manga_disc)
- ✅ Case-insensitive search with LIKE operator

**NG Cases:**
- ❌ 400: Missing keyword parameter
- ❌ 500: Database error

### GET /api/manga/tag/:tag_id

**OK Cases:**
- ✅ Get manga filtered by tag_id
- ✅ Uses JSON_CONTAINS to search tag_id array

**NG Cases:**
- ❌ 500: Database error

### POST /api/manga

**OK Cases:**
- ✅ Create manga with all required fields
- ✅ Upload background image (manga_bg_img)
- ✅ Handle tag_id as array
- ✅ Handle tag_id as string (converts to array)
- ✅ Handle tag_id as JSON string
- ✅ Store image in /images/<manga_slug>/ directory

**NG Cases:**
- ❌ 400: Missing required fields (manga_name, manga_disc, manga_slug)
- ❌ 409: Duplicate manga slug (ER_DUP_ENTRY)
- ❌ 500: Database error
- ❌ 500: File upload error

### PUT /api/manga/:id

**OK Cases:**
- ✅ Update manga with id in path parameter
- ✅ Update manga with id in request body
- ✅ Update manga_name, manga_disc, manga_slug
- ✅ Update tag_id (handles array/string/JSON)
- ✅ Update background image if new file uploaded
- ✅ Returns success message

**NG Cases:**
- ❌ 400: Missing manga ID (neither in path nor body)
- ❌ 404: Manga not found (affectedRows = 0)
- ❌ 500: Database error

### DELETE /api/manga/:id

**OK Cases:**
- ✅ Delete manga with id in path parameter
- ✅ Delete manga with id in request body
- ✅ Returns success message

**NG Cases:**
- ❌ 400: Missing manga ID
- ❌ 404: Manga not found
- ❌ 500: Database error

---

## 3. Tag Routes (`/api/tag`)

### GET /api/tag

**OK Cases:**
- ✅ Get all tags
- ✅ Map tag_name to "name" in response
- ✅ Return empty array if no tags

**NG Cases:**
- ❌ 500: Database error

### GET /api/tag/:id

**OK Cases:**
- ✅ Get tag by id
- ✅ Map tag_name to "name"

**NG Cases:**
- ❌ 404: Tag not found
- ❌ 500: Database error

### POST /api/tag

**OK Cases:**
- ✅ Create tag with "name" field
- ✅ Create tag with "tag_name" field
- ✅ Returns status 200 (not 201)
- ✅ Returns {tag_id, name}

**NG Cases:**
- ❌ 400: Missing tag name (both "name" and "tag_name" absent)
- ❌ 409: Tag already exists (ER_DUP_ENTRY)
- ❌ 500: Database error

### PUT /api/tag/:id

**OK Cases:**
- ✅ Update tag name
- ✅ Returns success message

**NG Cases:**
- ❌ 400: Missing tag_name
- ❌ 404: Tag not found
- ❌ 500: Database error

### DELETE /api/tag/:id

**OK Cases:**
- ✅ Delete tag
- ✅ Returns success message

**NG Cases:**
- ❌ 404: Tag not found
- ❌ 500: Database error

---

## 4. Episode Routes (`/api/episode`)

### POST /api/episode

**OK Cases:**
- ✅ Create episode with manga_name, episode_number, totalPage
- ✅ Upload multiple episode images (episode_images[])
- ✅ Find manga by manga_slug (manga_name is actually slug)
- ✅ Store images in /images/<manga_slug>/ep<number>/ directory
- ✅ Create manga_episodes record
- ✅ Create individual episodes records for each page
- ✅ Returns {episode_id, images: [urls]}

**NG Cases:**
- ❌ 400: Missing manga_name
- ❌ 400: Missing episode_number
- ❌ 400: Missing totalPage
- ❌ 404: Manga not found
- ❌ 500: Database error
- ❌ 500: File upload error

---

## 5. Episodes Routes (`/api/episodes`)

### GET /api/episodes

**OK Cases:**
- ✅ Get all episodes from manga_episodes table
- ✅ Return array of episodes

**NG Cases:**
- ❌ 500: Database error

### GET /api/episodes/manga/:manga_id

**OK Cases:**
- ✅ Get all episodes for specific manga
- ✅ Return empty array if no episodes

**NG Cases:**
- ❌ 500: Database error

### GET /api/episodes/:id

**OK Cases:**
- ✅ Get episode by id

**NG Cases:**
- ❌ 404: Episode not found
- ❌ 500: Database error

### GET /api/episodes/:episode_id/pages

**OK Cases:**
- ✅ Get all pages for episode from episodes table
- ✅ Ordered by page_number

**NG Cases:**
- ❌ 500: Database error

### POST /api/episodes

**OK Cases:**
- ✅ Create episode metadata in manga_episodes table
- ✅ Returns episode_id

**NG Cases:**
- ❌ 400: Missing manga_id
- ❌ 400: Missing episode_number
- ❌ 500: Database error

### POST /api/episodes/pages/upload

**OK Cases:**
- ✅ Upload multiple episode pages (up to 100)
- ✅ Find manga by manga_slug or manga_name
- ✅ Create manga_episodes if doesn't exist
- ✅ Create episodes records for each page
- ✅ Store images in /images/<slug>/ep<number>/ directory
- ✅ Returns {episode_id, pages_uploaded}

**NG Cases:**
- ❌ 400: Missing manga_slug/manga_name
- ❌ 400: Missing episode_number
- ❌ 404: Manga not found
- ❌ 500: Database error

### PUT /api/episodes/:id

**OK Cases:**
- ✅ Update episode metadata
- ✅ Returns 204 status

**NG Cases:**
- ❌ 404: Episode not found
- ❌ 500: Database error

### DELETE /api/episodes/:id

**OK Cases:**
- ✅ Delete episode
- ✅ Returns 204 status

**NG Cases:**
- ❌ 404: Episode not found
- ❌ 500: Database error

---

## 6. Comments Routes (`/api/comments`)

### GET /api/comments/manga/:manga_id/episode/:episode

**OK Cases:**
- ✅ Get all comments for specific episode
- ✅ Filter by status query parameter (?status=pending/published/rejected)
- ✅ Default shows all statuses if not specified

**NG Cases:**
- ❌ 500: Database error

### POST /api/comments

**OK Cases:**
- ✅ Create comment with user_id, manga_id, episode, comment
- ✅ Support parent_comment_id for nested comments
- ✅ Default status is 'pending'

**NG Cases:**
- ❌ 400: Missing required fields
- ❌ 500: Database error

### PATCH /api/comments/:id/status

**OK Cases:**
- ✅ Update comment status to pending/published/rejected
- ✅ Returns success message

**NG Cases:**
- ❌ 400: Invalid status value
- ❌ 404: Comment not found
- ❌ 500: Database error

### DELETE /api/comments/:id

**OK Cases:**
- ✅ Delete comment
- ✅ Returns 204 status

**NG Cases:**
- ❌ 404: Comment not found
- ❌ 500: Database error

---

## 7. Recommend Routes (`/api/recommend`)

### GET /api/recommend

**OK Cases:**
- ✅ Get all recommendations
- ✅ Filter by status (?status=pending/published/rejected)

**NG Cases:**
- ❌ 500: Database error

### POST /api/recommend

**OK Cases:**
- ✅ Create recommendation with name, slug, commenter, comment
- ✅ Upload background_image
- ✅ Default status is 'pending'
- ✅ Returns {recommend_id, name, slug, commenter, comment, background_image, status}

**NG Cases:**
- ❌ 400: Missing required fields
- ❌ 500: Database error
- ❌ 500: File upload error

### PUT /api/recommend/:id

**OK Cases:**
- ✅ Update recommendation
- ✅ Upload new background image if provided
- ✅ Returns success message

**NG Cases:**
- ❌ 404: Recommendation not found
- ❌ 500: Database error

### PATCH /api/recommend/:id/status

**OK Cases:**
- ✅ Update status to pending/published/rejected

**NG Cases:**
- ❌ 400: Invalid status
- ❌ 404: Recommendation not found
- ❌ 500: Database error

### DELETE /api/recommend/:id

**OK Cases:**
- ✅ Delete recommendation
- ✅ Returns success message

**NG Cases:**
- ❌ 404: Recommendation not found
- ❌ 500: Database error

---

## 8. Advertise Routes (`/api/advertise`)

### GET /api/advertise

**OK Cases:**
- ✅ Get all advertisements
- ✅ Filter by is_active status (?is_active=true/false)

**NG Cases:**
- ❌ 500: Database error

### POST /api/advertise

**OK Cases:**
- ✅ Create advertisement with name, image
- ✅ Upload image file
- ✅ Optional link_url, is_active, created_date
- ✅ Default is_active = true
- ✅ Returns {ad_id, name, image, link_url, is_active, created_date}

**NG Cases:**
- ❌ 400: Missing name
- ❌ 400: Missing image file
- ❌ 500: Database error

### PUT /api/advertise/:id

**OK Cases:**
- ✅ Update advertisement
- ✅ Upload new image if provided
- ✅ Returns success message

**NG Cases:**
- ❌ 404: Advertisement not found
- ❌ 500: Database error

### PATCH /api/advertise/:id/toggle

**OK Cases:**
- ✅ Toggle is_active status
- ✅ Returns success message

**NG Cases:**
- ❌ 404: Advertisement not found
- ❌ 500: Database error

### DELETE /api/advertise/:id

**OK Cases:**
- ✅ Delete advertisement
- ✅ Returns success message

**NG Cases:**
- ❌ 404: Advertisement not found
- ❌ 500: Database error

---

## 9. Menubar Routes (`/api/menubar`)

### GET /api/menubar

**OK Cases:**
- ✅ Get all menu items ordered by id ASC

**NG Cases:**
- ❌ 500: Database error

### GET /api/menubar/active

**OK Cases:**
- ✅ Get only active menu items (is_active = true)

**NG Cases:**
- ❌ 500: Database error

### POST /api/menubar

**OK Cases:**
- ✅ Create menu item with name, href
- ✅ Optional id (ordering), is_active
- ✅ Default is_active = true
- ✅ Returns {menu_id, name, href, is_active}

**NG Cases:**
- ❌ 400: Missing name
- ❌ 400: Missing href
- ❌ 500: Database error

### POST /api/menubar/reorder

**OK Cases:**
- ✅ Bulk update menu ordering
- ✅ Accepts array of {menu_id, id}
- ✅ Returns success message

**NG Cases:**
- ❌ 400: Invalid items array
- ❌ 500: Database error

### PUT /api/menubar/:id

**OK Cases:**
- ✅ Update menu item
- ✅ Returns 204 status

**NG Cases:**
- ❌ 404: Menu item not found
- ❌ 500: Database error

### DELETE /api/menubar/:id

**OK Cases:**
- ✅ Delete menu item
- ✅ Returns success message

**NG Cases:**
- ❌ 404: Menu item not found
- ❌ 500: Database error

---

## 10. Favorites Routes (`/api/favorites`)

### GET /api/favorites/user/:user_id

**OK Cases:**
- ✅ Get all favorited manga for user
- ✅ Joins with manga and manga_episodes tables
- ✅ Returns manga details with latest episode

**NG Cases:**
- ❌ 500: Database error

### GET /api/favorites/check

**OK Cases:**
- ✅ Check if manga is favorited (?user_id=x&manga_id=y)
- ✅ Returns {is_favorite: true/false}

**NG Cases:**
- ❌ 400: Missing user_id
- ❌ 400: Missing manga_id
- ❌ 500: Database error

### GET /api/favorites/top

**OK Cases:**
- ✅ Get top 10 most favorited manga
- ✅ Returns manga with favorite_count

**NG Cases:**
- ❌ 500: Database error

### POST /api/favorites

**OK Cases:**
- ✅ Add manga to favorites
- ✅ Returns favorite id

**NG Cases:**
- ❌ 400: Missing user_id
- ❌ 400: Missing manga_id
- ❌ 409: Already favorited (ER_DUP_ENTRY)
- ❌ 500: Database error

### DELETE /api/favorites

**OK Cases:**
- ✅ Remove from favorites
- ✅ Delete by user_id and manga_id in request body

**NG Cases:**
- ❌ 400: Missing user_id
- ❌ 400: Missing manga_id
- ❌ 404: Favorite not found
- ❌ 500: Database error

---

## 11. Users Routes (`/api/users`)

### GET /api/users

**OK Cases:**
- ✅ Get all users
- ✅ Excludes password field

**NG Cases:**
- ❌ 500: Database error

### GET /api/users/:id

**OK Cases:**
- ✅ Get user by id
- ✅ Excludes password

**NG Cases:**
- ❌ 404: User not found
- ❌ 500: Database error

### POST /api/users/:id/change-password

**OK Cases:**
- ✅ Change password with old and new password
- ✅ Verifies old password matches
- ✅ Hashes new password
- ✅ Deletes all user sessions (force re-login)

**NG Cases:**
- ❌ 400: Missing old_password
- ❌ 400: Missing new_password
- ❌ 401: Old password incorrect
- ❌ 404: User not found
- ❌ 500: Database error

### PUT /api/users/:id

**OK Cases:**
- ✅ Update user profile (username, email, role)
- ✅ Returns 204 status

**NG Cases:**
- ❌ 404: User not found
- ❌ 500: Database error

### DELETE /api/users/:id

**OK Cases:**
- ✅ Delete user
- ✅ Returns 204 status

**NG Cases:**
- ❌ 404: User not found
- ❌ 500: Database error

---

## 12. Logs Routes (`/api/logs`)

### GET /api/logs

**OK Cases:**
- ✅ Get all activity logs

**NG Cases:**
- ❌ 500: Database error

### POST /api/logs

**OK Cases:**
- ✅ Create log entry with user_id, action, details
- ✅ Auto-timestamp

**NG Cases:**
- ❌ 400: Missing required fields
- ❌ 500: Database error

---

## Summary Statistics

### Total Test Cases: 250+

**By Route:**
- Auth: 20 test cases
- Manga: 35 test cases
- Tag: 18 test cases
- Episode: 12 test cases
- Episodes: 28 test cases
- Comments: 15 test cases
- Recommend: 18 test cases
- Advertise: 16 test cases
- Menubar: 16 test cases
- Favorites: 15 test cases
- Users: 14 test cases
- Logs: 4 test cases

**By Type:**
- OK Cases: ~140
- NG Cases: ~110

**Common NG Cases Across All Routes:**
- 400: Missing required fields
- 404: Resource not found
- 409: Duplicate entry (unique constraint violation)
- 500: Database/server errors

---

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.js
```

## Test Coverage Goals

- **Lines**: 70%+
- **Functions**: 70%+
- **Branches**: 70%+
- **Statements**: 70%+
