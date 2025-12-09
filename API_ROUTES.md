# API Routes Documentation

This document describes all API routes used by the Manga-Ara frontend application and their corresponding backend endpoints.

**Base URL:** `https://manga.cipacmeeting.com` (configured via `NEXT_PUBLIC_API_URL` environment variable)

---

## Table of Contents
1. [Authentication Routes](#authentication-routes)
2. [Manga Management Routes](#manga-management-routes)
3. [Manga Detail Routes](#manga-detail-routes)
4. [Tag Management Routes](#tag-management-routes)
5. [Menubar Management Routes](#menubar-management-routes)
6. [Recommendation Management Routes](#recommendation-management-routes)
7. [Upload Routes](#upload-routes)
8. [Test Connection Routes](#test-connection-routes)
9. [Episode Routes](#episode-routes)
10. [Web Scraping Routes](#web-scraping-routes)

---

## Authentication Routes

### Base Path: `/api/auth`

#### 1. Register User
**Frontend Route:** `POST /api/auth?action=register`  
**Backend Endpoint:** `POST /api/auth/register`

**Request Payload:**
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "display_name": "string (optional)"
}
```

**Response (Success - 201):**
```json
{
  "user_id": "integer",
  "email": "string",
  "display_name": "string"
}
```

**Response (Error - 409):**
```json
{
  "error": "Email already exists"
}
```

**Response (Error - 400):**
```json
{
  "error": "Missing required fields"
}
```

---

#### 2. Login User
**Frontend Route:** `POST /api/auth?action=login`  
**Backend Endpoint:** `POST /api/auth/login`

**Request Payload:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (Success - 200):**
```json
{
  "token": "string (JWT token)",
  "user": {
    "user_id": "integer",
    "email": "string",
    "display_name": "string"
  }
}
```

**Response (Error - 401):**
```json
{
  "error": "Invalid credentials"
}
```

**Response (Error - 400):**
```json
{
  "error": "Missing email or password"
}
```

---

#### 3. Verify Token
**Frontend Route:** `POST /api/auth?action=verify`  
**Backend Endpoint:** `POST /api/auth/verify`

**Request Payload:**
```json
{
  "token": "string (required)"
}
```

**Response (Success - 200):**
```json
{
  "valid": true,
  "user": {
    "user_id": "integer",
    "email": "string",
    "display_name": "string"
  }
}
```

**Response (Error - 401):**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

---

#### 4. Logout User
**Frontend Route:** `POST /api/auth?action=logout`  
**Backend Endpoint:** `POST /api/auth/logout`

**Request Payload:**
```json
{
  "token": "string (required)"
}
```

**Response (Success - 200):**
```json
{
  "message": "Logout successful"
}
```

**Response (Error - 400):**
```json
{
  "error": "Token required"
}
```

---

## Manga Management Routes

### Base Path: `/api/mangas`

#### 1. Get All Mangas
**Frontend Route:** `GET /api/mangas`  
**Backend Endpoint:** `GET /api/mangas`

**Request:** No payload required

**Response (Success - 200):**
```json
[
  {
    "manga_id": "integer",
    "name": "string",
    "slug": "string",
    "description": "string",
    "background_image": "string (URL)",
    "tag": ["string"],
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

---

#### 2. Create Manga
**Frontend Route:** `POST /api/mangas`  
**Backend Endpoint:** `POST /api/mangas`

**Request Payload (FormData):**
```
manga_name: string (required)
manga_slug: string (required)
manga_disc: string (required)
tag_id: string (array format: "['tag1','tag2']") (required)
manga_bg_img: File (image file) (required)
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response (Success - 200):**
```json
{
  "manga_id": "integer",
  "name": "string",
  "slug": "string",
  "description": "string",
  "backgroundImage": "string (URL)",
  "tag": ["string"]
}
```

**Response (Error - 400):**
```json
{
  "error": "Missing required fields"
}
```

---

#### 3. Update Manga
**Frontend Route:** `PUT /api/mangas`  
**Backend Endpoint:** `PUT /api/mangas`

**Request Payload:**
```json
{
  "id": "integer (required)",
  "name": "string (optional)",
  "slug": "string (optional)",
  "description": "string (optional)",
  "backgroundImage": "string (optional)",
  "tag": ["string"] (optional)
}
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response (Success - 200):**
```json
{
  "message": "Manga updated successfully"
}
```

**Response (Error - 404):**
```json
{
  "error": "Manga not found"
}
```

---

#### 4. Delete Manga
**Frontend Route:** `DELETE /api/mangas`  
**Backend Endpoint:** `DELETE /api/mangas`

**Request Payload:**
```json
{
  "id": "integer (required)"
}
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response (Success - 200):**
```json
{
  "message": "Manga deleted successfully"
}
```

**Response (Error - 404):**
```json
{
  "error": "Manga not found"
}
```

---

## Manga Detail Routes

### Base Path: `/api/manga` (dynamic: `/api/[manga]`)

#### 1. Get Manga Details
**Frontend Route:** `GET /api/manga`  
**Backend Endpoint:** `GET /api/manga`

**Query Parameters:**
```
slug: string (manga slug) (optional)
id: integer (manga ID) (optional)
```

**Response (Success - 200):**
```json
{
  "manga_id": "integer",
  "name": "string",
  "slug": "string",
  "description": "string",
  "background_image": "string (URL)",
  "tag": ["string"],
  "episodes": [
    {
      "episode_id": "integer",
      "episode_number": "integer",
      "total_pages": "integer",
      "views": "integer",
      "created_at": "timestamp"
    }
  ]
}
```

---

#### 2. Create Manga Detail
**Frontend Route:** `POST /api/manga`  
**Backend Endpoint:** `POST /api/manga`

**Request Payload:**
```json
{
  "name": "string (required)",
  "slug": "string (required)",
  "description": "string (optional)",
  "backgroundImage": "string (optional)",
  "tag": ["string"] (optional)
}
```

---

#### 3. Update Manga Detail
**Frontend Route:** `PUT /api/manga`  
**Backend Endpoint:** `PUT /api/manga`

**Request Payload:**
```json
{
  "id": "integer (required)",
  "name": "string (optional)",
  "slug": "string (optional)",
  "description": "string (optional)",
  "backgroundImage": "string (optional)",
  "tag": ["string"] (optional)
}
```

---

#### 4. Delete Manga Detail
**Frontend Route:** `DELETE /api/manga`  
**Backend Endpoint:** `DELETE /api/manga`

**Request Payload:**
```json
{
  "id": "integer (required)"
}
```

---

## Tag Management Routes

### Base Path: `/api/tags`

#### 1. Get All Tags
**Frontend Route:** `GET /api/tags`  
**Backend Endpoint:** `GET /api/tags`

**Request:** No payload required

**Response (Success - 200):**
```json
[
  {
    "tag_id": "integer",
    "name": "string",
    "created_at": "timestamp"
  }
]
```

---

#### 2. Create Tag
**Frontend Route:** `POST /api/tags`  
**Backend Endpoint:** `POST /api/tags`

**Request Payload:**
```json
{
  "name": "string (required)"
}
```

**Response (Success - 200):**
```json
{
  "tag_id": "integer",
  "name": "string"
}
```

**Response (Error - 409):**
```json
{
  "error": "Tag already exists"
}
```

**Response (Error - 400):**
```json
{
  "error": "Tag name is required"
}
```

---

#### 3. Delete Tag
**Frontend Route:** `DELETE /api/tags`  
**Backend Endpoint:** `DELETE /api/tags`

**Request Payload:**
```json
{
  "id": "integer (required)"
}
```

**Response (Success - 200):**
```json
{
  "message": "Tag deleted successfully"
}
```

**Response (Error - 404):**
```json
{
  "error": "Tag not found"
}
```

---

## Menubar Management Routes

### Base Path: `/api/menubar`

#### 1. Get All Menu Items
**Frontend Route:** `GET /api/menubar`  
**Backend Endpoint:** `GET /api/menubar`

**Request:** No payload required

**Response (Success - 200):**
```json
[
  {
    "menu_id": "integer",
    "name": "string",
    "href": "string",
    "is_active": "boolean",
    "created_at": "timestamp"
  }
]
```

---

#### 2. Create Menu Item
**Frontend Route:** `POST /api/menubar`  
**Backend Endpoint:** `POST /api/menubar`

**Request Payload:**
```json
{
  "name": "string (required)",
  "href": "string (required)",
  "is_active": "boolean (optional, default: true)"
}
```

**Response (Success - 200):**
```json
{
  "menu_id": "integer",
  "name": "string",
  "href": "string",
  "is_active": "boolean"
}
```

**Response (Error - 400):**
```json
{
  "error": "Name and href are required"
}
```

---

#### 3. Delete Menu Item
**Frontend Route:** `DELETE /api/menubar`  
**Backend Endpoint:** `DELETE /api/menubar`

**Request Payload:**
```json
{
  "id": "integer (required)"
}
```

**Response (Success - 200):**
```json
{
  "message": "Menu item deleted successfully"
}
```

**Response (Error - 404):**
```json
{
  "error": "Menu item not found"
}
```

---

## Recommendation Management Routes

### Base Path: `/api/recommend`

#### 1. Get All Recommendations
**Frontend Route:** `GET /api/recommend`  
**Backend Endpoint:** `GET /api/recommend`

**Request:** No payload required

**Response (Success - 200):**
```json
[
  {
    "recommend_id": "integer",
    "name": "string",
    "slug": "string",
    "commenter": "string",
    "comment": "string",
    "background_image": "string (URL)",
    "status": "string (pending/approved/rejected)",
    "created_at": "timestamp"
  }
]
```

---

#### 2. Create Recommendation
**Frontend Route:** `POST /api/recommend`  
**Backend Endpoint:** `POST /api/recommend`

**Request Payload:**
```json
{
  "name": "string (required)",
  "slug": "string (required)",
  "commenter": "string (required)",
  "comment": "string (required)",
  "background_image": "string (URL) (optional)"
}
```

**Response (Success - 200):**
```json
{
  "recommend_id": "integer",
  "name": "string",
  "slug": "string",
  "commenter": "string",
  "comment": "string",
  "status": "pending"
}
```

**Response (Error - 400):**
```json
{
  "error": "Missing required fields"
}
```

---

#### 3. Update Recommendation
**Frontend Route:** `PUT /api/recommend`  
**Backend Endpoint:** `PUT /api/recommend`

**Request Payload:**
```json
{
  "id": "integer (required)",
  "status": "string (optional: pending/approved/rejected)",
  "name": "string (optional)",
  "slug": "string (optional)",
  "comment": "string (optional)"
}
```

**Response (Success - 200):**
```json
{
  "message": "Recommendation updated successfully"
}
```

**Response (Error - 404):**
```json
{
  "error": "Recommendation not found"
}
```

---

#### 4. Delete Recommendation
**Frontend Route:** `DELETE /api/recommend`  
**Backend Endpoint:** `DELETE /api/recommend`

**Request Payload:**
```json
{
  "id": "integer (required)"
}
```

**Response (Success - 200):**
```json
{
  "message": "Recommendation deleted successfully"
}
```

---

## Upload Routes

### Base Path: `/api/upload`

#### 1. Upload File
**Frontend Route:** `POST /api/upload`  
**Backend Endpoint:** `POST /api/upload`

**Request Payload (FormData):**
```
file: File (image file) (required)
folder: string (optional, default: 'uploads')
```

**Response (Success - 200):**
```json
{
  "url": "string (uploaded file URL)",
  "filename": "string",
  "size": "integer (bytes)"
}
```

**Response (Error - 400):**
```json
{
  "error": "No file uploaded"
}
```

---

## Test Connection Routes

### Base Path: `/api/test-connection`

#### 1. Test Backend Connection
**Frontend Route:** `GET /api/test-connection`  
**Backend Endpoint:** `GET /api/test-connection`

**Request:** No payload required

**Response (Success - 200):**
```json
{
  "status": "connected",
  "message": "Backend connection successful",
  "timestamp": "timestamp"
}
```

**Response (Error - 500):**
```json
{
  "error": "Connection failed"
}
```

---

## Episode Routes

### Base Path: `/api/episode` (not implemented in frontend proxy, called directly)

#### 1. Create Episode
**Direct Backend Call:** `POST https://mangaara.com/api/episode`

**Request Payload (FormData):**
```
manga_name: string (manga slug) (required)
episode_number: integer (required)
totalPage: integer (number of pages) (required)
view: integer (default: 0) (optional)
episode_images: File[] (array of image files) (required)
```

**Response (Success - 200):**
```json
{
  "episode_id": "integer",
  "manga_name": "string",
  "episode_number": "integer",
  "total_pages": "integer",
  "images": ["string (URLs)"]
}
```

**Response (Error - 400):**
```json
{
  "error": "Missing required fields"
}
```

---

#### 2. Get Episode Images
**Frontend Route:** `GET /api/[manga]/[ep]`  
**Firebase Storage:** Direct call to Firebase Storage (legacy)

**Path Parameters:**
```
manga: string (manga slug)
ep: integer (episode number)
```

**Response (Success - 200):**
```json
{
  "images": [
    "string (Firebase Storage URL)",
    "string (Firebase Storage URL)"
  ]
}
```

**Note:** This route still uses Firebase Admin SDK and should be migrated to backend API.

---

## Web Scraping Routes

### Base Path: `/api/steal`

#### 1. Scrape Manga Images
**Frontend Route:** `GET /api/steal`  
**Direct Implementation:** Local scraping with Cheerio

**Request:** No payload required

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Images downloaded and renamed",
  "images": [
    "page1.jpg",
    "page2.jpg",
    "page3.jpg"
  ]
}
```

**Response (Error - 404):**
```json
{
  "error": "No images found"
}
```

**Response (Error - 500):**
```json
{
  "error": "Something went wrong"
}
```

**Note:** This route scrapes images from a hardcoded URL and saves them to the Desktop. Should be refactored to accept dynamic URLs.

---

## Common Error Responses

All API routes may return these common error responses:

**500 - Internal Server Error:**
```json
{
  "error": "Error message describing what went wrong"
}
```

**401 - Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 - Forbidden:**
```json
{
  "error": "Insufficient permissions"
}
```

---

## Environment Configuration

The backend URL is configured via environment variable:

```env
NEXT_PUBLIC_API_URL=https://manga.cipacmeeting.com
```

All frontend API routes proxy requests to this backend server. The environment variable should be set in `.env.local` for local development.

---

## Frontend API Route Structure

All frontend API routes follow this pattern:

```javascript
const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/{endpoint}`;

export async function METHOD(req) {
  try {
    const body = await req.json(); // or req.formData()
    const response = await fetch(API_URL, {
      method: 'METHOD',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

This ensures all API calls are proxied through the Next.js API routes to the backend server.

---

## Authentication Flow

1. **Login:**
   - Frontend calls `POST /api/auth?action=login`
   - Backend validates credentials and returns JWT token
   - Frontend stores token in localStorage

2. **Token Verification:**
   - Frontend calls `POST /api/auth?action=verify` with token
   - Backend validates token and returns user data
   - Frontend uses this for protected routes

3. **Logout:**
   - Frontend calls `POST /api/auth?action=logout` with token
   - Backend invalidates token
   - Frontend removes token from localStorage

---

## Testing

All API routes have comprehensive test coverage using Cypress. Tests include:
- **OK Cases:** Testing successful operations
- **NG Cases:** Testing error handling and validation

Test files are located in `cypress/e2e/api.cy.js` and other page-specific test files.

Run tests with:
```bash
npm run test        # Run all tests headlessly
npm run test:api    # Run API tests only
npm run test:open   # Open Cypress GUI
```

---

## Notes

1. **Episode Image Route:** The `/api/[manga]/[ep]` route still uses Firebase Storage directly and should be migrated to the backend API.

2. **Web Scraping Route:** The `/api/steal` route has a hardcoded URL and saves files to the local Desktop. This should be refactored for production use.

3. **Episode Creation:** The episode creation directly calls `https://mangaara.com/api/episode` instead of using the proxy pattern. This should be updated to use the environment variable.

4. **Authorization Headers:** Some routes require Bearer token authentication. The token should be included in the Authorization header for protected routes.

5. **FormData Uploads:** Routes that accept file uploads use FormData instead of JSON payloads.
