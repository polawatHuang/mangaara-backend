# Manga-Ara Backend API Documentation

Complete API documentation for the Manga-Ara MySQL backend.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Import the `database-schema.sql` file into your MySQL database:
```bash
mysql -u your_user -p manga_ara < database-schema.sql
```

### 3. Environment Variables
Create a `.env` file (optional, or configure in `db.js`):
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=mangaa_admin
DB_PASSWORD=your_password
DB_NAME=manga_ara
ADMIN_API_KEY=your_secret_key
PORT=443
```

### 4. Start Server
```bash
npm start
```

---

## API Endpoints

### Base URL
```
https://localhost:443/api
```

---

## 1. Manga Routes (`/api/mangas`)

### Create Manga
- **POST** `/api/mangas`
- **Body**: FormData with fields:
  - `manga_name` (string, required)
  - `manga_disc` (text)
  - `manga_slug` (string, required)
  - `tag_id` (JSON array, e.g., `["แฟนตาซี","รักโรแมนติก"]`)
  - `manga_bg_img` (file upload)
- **Response**: `{ id: number, manga_bg_img: string }`

### Get All Manga
- **GET** `/api/mangas`
- **Response**: Array of manga with episodes aggregated

### Get Manga by ID
- **GET** `/api/mangas/:id`
- **Response**: Manga object with episodes

### Get Manga by Slug
- **GET** `/api/mangas/slug/:slug`
- **Response**: Manga object with episodes

### Update Manga
- **PUT** `/api/mangas/:id`
- **Body**: Same as create (fields are optional)
- **Response**: 204 No Content

### Delete Manga
- **DELETE** `/api/mangas/:id`
- **Response**: 204 No Content

### Increment View Count
- **POST** `/api/mangas/:id/view`
- **Response**: 204 No Content

### Get Trending Manga
- **GET** `/api/mangas/trending/top?limit=10`
- **Response**: Array of top viewed manga

### Search Manga
- **GET** `/api/mangas/search/:query`
- **Response**: Array of matching manga

### Get Manga by Tag
- **GET** `/api/mangas/tag/:tagName`
- **Response**: Array of manga with specified tag

---

## 2. Episode Routes (`/api/episodes`)

### Create Episode (Metadata)
- **POST** `/api/episodes`
- **Body**: `{ manga_id, episode, episode_name, total_pages, created_date, updated_date }`
- **Response**: `{ id: number, message: string }`

### Get Episodes for Manga
- **GET** `/api/episodes/manga/:manga_id`
- **Response**: Array of episodes

### Get Specific Episode
- **GET** `/api/episodes/:id`
- **Response**: Episode object

### Get Episode by Manga ID and Number
- **GET** `/api/episodes/manga/:manga_id/episode/:episode`
- **Response**: Episode object

### Update Episode
- **PUT** `/api/episodes/:id`
- **Body**: `{ episode_name, total_pages, updated_date }`
- **Response**: 204 No Content

### Delete Episode
- **DELETE** `/api/episodes/:id`
- **Response**: 204 No Content

### Increment Episode View
- **POST** `/api/episodes/:id/view`
- **Response**: 204 No Content

### Get Latest Episodes
- **GET** `/api/episodes/latest/all?limit=20`
- **Response**: Array of latest episodes across all manga

### Upload Episode Pages
- **POST** `/api/episodes/pages/upload`
- **Body**: FormData with:
  - `manga_id` (number)
  - `manga_slug` (string)
  - `episode` (number)
  - `episode_images` (multiple files)
- **Response**: `{ message: string, total_pages: number }`

### Get Episode Pages
- **GET** `/api/episodes/pages/manga/:manga_id/episode/:episode`
- **Response**: Array of page objects with image URLs

### Get Pages by Slug
- **GET** `/api/episodes/pages/slug/:manga_slug/episode/:episode`
- **Response**: Array of page objects

### Delete Episode Pages
- **DELETE** `/api/episodes/pages/manga/:manga_id/episode/:episode`
- **Response**: 204 No Content

---

## 3. Tag Routes (`/api/tags`)

### Create Tag
- **POST** `/api/tags`
- **Body**: `{ tag_name: string }`
- **Response**: `{ id: number }`

### Get All Tags
- **GET** `/api/tags`
- **Response**: Array of tags

### Get Tag by ID
- **GET** `/api/tags/:id`
- **Response**: Tag object

### Update Tag
- **PUT** `/api/tags/:id`
- **Body**: `{ tag_name: string }`
- **Response**: 204 No Content

### Delete Tag
- **DELETE** `/api/tags/:id`
- **Response**: 204 No Content

---

## 4. Comment Routes (`/api/comments`)

### Create Comment
- **POST** `/api/comments`
- **Body**: `{ manga_id, episode, commenter, comment, status }`
- **Response**: `{ id: number, message: string }`

### Get Comments for Episode
- **GET** `/api/comments/manga/:manga_id/episode/:episode?status=published`
- **Response**: Array of comments

### Get All Comments
- **GET** `/api/comments?status=published`
- **Response**: Array of all comments

### Get Comment by ID
- **GET** `/api/comments/:id`
- **Response**: Comment object

### Update Comment
- **PUT** `/api/comments/:id`
- **Body**: `{ comment, status }`
- **Response**: 204 No Content

### Update Comment Status
- **PATCH** `/api/comments/:id/status`
- **Body**: `{ status: "pending" | "published" | "rejected" }`
- **Response**: 204 No Content

### Delete Comment
- **DELETE** `/api/comments/:id`
- **Response**: 204 No Content

### Get Recent Comments
- **GET** `/api/comments/recent/all?limit=20&status=published`
- **Response**: Array of recent comments with manga info

---

## 5. Recommendation Routes (`/api/recommend`)

### Create Recommendation
- **POST** `/api/recommend`
- **Body**: FormData with:
  - `name` (string)
  - `slug` (string)
  - `commenter` (string)
  - `comment` (text)
  - `status` (optional)
  - `background_image` (file)
- **Response**: `{ id: number, background_image: string, message: string }`

### Get All Recommendations
- **GET** `/api/recommend?status=published`
- **Response**: Array of recommendations

### Get Published Recommendations
- **GET** `/api/recommend/published?limit=10`
- **Response**: Array of published recommendations

### Get Recommendations for Manga
- **GET** `/api/recommend/manga/:slug`
- **Response**: Array of recommendations for specific manga

### Get Recommendation by ID
- **GET** `/api/recommend/:id`
- **Response**: Recommendation object

### Update Recommendation
- **PUT** `/api/recommend/:id`
- **Body**: FormData (same as create)
- **Response**: 204 No Content

### Update Status
- **PATCH** `/api/recommend/:id/status`
- **Body**: `{ status: "pending" | "published" | "rejected" }`
- **Response**: 204 No Content

### Delete Recommendation
- **DELETE** `/api/recommend/:id`
- **Response**: 204 No Content

---

## 6. Advertisement Routes (`/api/advertise`)

### Create Advertisement
- **POST** `/api/advertise`
- **Body**: FormData with:
  - `name` (string)
  - `image` (file)
  - `link_url` (string, optional)
  - `is_active` (boolean)
  - `created_date` (date)
- **Response**: `{ id: number, image: string, message: string }`

### Get All Advertisements
- **GET** `/api/advertise`
- **Response**: Array of advertisements

### Get Active Advertisements
- **GET** `/api/advertise/active`
- **Response**: Array of active advertisements

### Get Advertisement by ID
- **GET** `/api/advertise/:id`
- **Response**: Advertisement object

### Update Advertisement
- **PUT** `/api/advertise/:id`
- **Body**: FormData (same as create)
- **Response**: 204 No Content

### Toggle Active Status
- **PATCH** `/api/advertise/:id/toggle`
- **Response**: 204 No Content

### Delete Advertisement
- **DELETE** `/api/advertise/:id`
- **Response**: 204 No Content

---

## 7. Menubar Routes (`/api/menubar`)

### Create Menu Item
- **POST** `/api/menubar`
- **Body**: `{ name, href, id, is_active }`
- **Response**: `{ menu_id: number, message: string }`

### Get All Menu Items
- **GET** `/api/menubar`
- **Response**: Array of menu items ordered by id

### Get Active Menu Items
- **GET** `/api/menubar/active`
- **Response**: Array of active menu items

### Get Menu Item by ID
- **GET** `/api/menubar/:menu_id`
- **Response**: Menu item object

### Update Menu Item
- **PUT** `/api/menubar/:menu_id`
- **Body**: `{ name, href, id, is_active }`
- **Response**: 204 No Content

### Toggle Active Status
- **PATCH** `/api/menubar/:menu_id/toggle`
- **Response**: 204 No Content

### Delete Menu Item
- **DELETE** `/api/menubar/:menu_id`
- **Response**: 204 No Content

### Reorder Menu Items
- **POST** `/api/menubar/reorder`
- **Body**: `{ items: [{ menu_id: 1, id: 1 }, ...] }`
- **Response**: `{ message: string }`

---

## 8. User Routes (`/api/users`)

### Register User
- **POST** `/api/users/register`
- **Body**: `{ email, password, display_name, role }`
- **Response**: `{ user_id, email, display_name, role, message }`

### Login
- **POST** `/api/users/login`
- **Body**: `{ email, password }`
- **Response**: `{ token, user: { user_id, email, display_name, role } }`

### Logout
- **POST** `/api/users/logout`
- **Body**: `{ token }`
- **Response**: `{ message: string }`

### Verify Token
- **POST** `/api/users/verify`
- **Body**: `{ token }`
- **Response**: `{ valid: boolean, user: {...} }`

### Get All Users
- **GET** `/api/users`
- **Response**: Array of users (without password hashes)

### Get User by ID
- **GET** `/api/users/:id`
- **Response**: User object

### Update User
- **PUT** `/api/users/:id`
- **Body**: `{ email, display_name, role, is_active }`
- **Response**: 204 No Content

### Change Password
- **POST** `/api/users/:id/change-password`
- **Body**: `{ old_password, new_password }`
- **Response**: `{ message: string }`

### Delete User
- **DELETE** `/api/users/:id`
- **Response**: 204 No Content

### Clean Up Expired Sessions
- **POST** `/api/users/sessions/cleanup`
- **Response**: `{ message: string, deleted: number }`

---

## 9. Favorites Routes (`/api/favorites`)

### Add to Favorites
- **POST** `/api/favorites`
- **Body**: `{ user_id, manga_id }`
- **Response**: `{ id: number, message: string }`

### Get User's Favorites
- **GET** `/api/favorites/user/:user_id`
- **Response**: Array of favorite manga with episode counts

### Check if Favorited
- **GET** `/api/favorites/user/:user_id/manga/:manga_id`
- **Response**: `{ is_favorite: boolean }`

### Remove from Favorites
- **DELETE** `/api/favorites/user/:user_id/manga/:manga_id`
- **Response**: 204 No Content

### Delete Favorite by ID
- **DELETE** `/api/favorites/:id`
- **Response**: 204 No Content

### Get Favorite Count for Manga
- **GET** `/api/favorites/manga/:manga_id/count`
- **Response**: `{ favorite_count: number }`

### Get Most Favorited Manga
- **GET** `/api/favorites/top?limit=10`
- **Response**: Array of top favorited manga

---

## 10. Logs Routes (`/api/logs`)

### Get All Logs
- **GET** `/api/logs`
- **Response**: Array of logs ordered by created_at

---

## Authentication

### Using Session Tokens
After logging in via `/api/users/login`, include the token in requests:

**Header:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```
or
```
x-auth-token: YOUR_TOKEN_HERE
```

### Admin API Key (Legacy)
For admin-only endpoints, you can use:
```
x-api-key: YOUR_ADMIN_KEY
```

---

## Middleware

### Available Middleware
- `requireAuth` - Requires valid session token
- `requireAdmin` - Requires admin role or API key
- `requireUserOrAdmin` - Requires user to be the resource owner or admin

### Example Usage
```javascript
const { requireAuth, requireAdmin } = require('./middleware/auth');

router.get('/protected', requireAuth, (req, res) => {
  // req.user contains authenticated user info
});

router.delete('/admin-only', requireAdmin, (req, res) => {
  // Admin only
});
```

---

## Database Tables

### Schema Overview
1. **tags** - Manga categories/genres
2. **manga** - Main manga information
3. **manga_episodes** - Episode metadata
4. **episodes** - Individual page images
5. **comment_on_episode** - User comments
6. **recommend** - Manga recommendations
7. **advertise** - Advertisement banners
8. **menubar** - Navigation menu items
9. **users** - User accounts
10. **sessions** - User login sessions
11. **favorite_manga** - User favorites

---

## Notes

### Image Storage
- Images are stored in `/var/www/vhosts/mangaara.com/httpdocs/images/`
- Subdirectories: `manga/`, `recommend/`, `advertise/`

### CORS Configuration
Currently allows:
- https://www.mangaara.com
- https://mangaara.vercel.app

### Rate Limiting
- Window: 50 minutes
- Max requests: 1000 per IP

### File Upload Limits
- Max file size: 10MB
- Allowed formats: .jpg, .jpeg, .png (and .gif for ads)

---

## Error Handling

All endpoints return errors in the format:
```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 204: No Content (successful update/delete)
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (duplicate entry)
- 500: Server Error
