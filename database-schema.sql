-- ============================================
-- MANGA-ARA DATABASE SCHEMA (MySQL)
-- Complete SQL table definitions for the project
-- Migrating from Firebase to MySQL database
-- ============================================

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS `favorite_manga`;
DROP TABLE IF EXISTS `comment_on_episode`;
DROP TABLE IF EXISTS `episodes`;
DROP TABLE IF EXISTS `manga_episodes`;
DROP TABLE IF EXISTS `recommend`;
DROP TABLE IF EXISTS `advertise`;
DROP TABLE IF EXISTS `manga`;
DROP TABLE IF EXISTS `tags`;
DROP TABLE IF EXISTS `menubar`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `sessions`;

-- ============================================
-- 1. TAGS TABLE
-- Stores manga categories/genres (แฟนตาซี, รักโรแมนติก, แอคชั่น, etc.)
-- Used in /api/tags route
-- ============================================
CREATE TABLE `tags` (
  `tag_id` INT AUTO_INCREMENT PRIMARY KEY,
  `tag_name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tag_name (`tag_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. MANGA TABLE
-- Stores main manga information
-- Used in /api/mangas route
-- Matches API fields: manga_name, manga_slug, manga_disc, manga_bg_img, tag_id, view
-- ============================================
CREATE TABLE `manga` (
  `manga_id` INT AUTO_INCREMENT PRIMARY KEY,
  `manga_name` VARCHAR(255) NOT NULL,
  `manga_slug` VARCHAR(255) NOT NULL UNIQUE,
  `manga_disc` TEXT,
  `manga_bg_img` VARCHAR(500),
  `tag_id` JSON COMMENT 'Array of tag names like ["แฟนตาซี","รักโรแมนติก"]',
  `view` BIGINT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_manga_slug (`manga_slug`),
  INDEX idx_view (`view` DESC),
  INDEX idx_created_at (`created_at` DESC),
  FULLTEXT idx_manga_name (`manga_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. MANGA_EPISODES TABLE
-- Stores individual manga episodes/chapters with embedded episode data
-- This replaces Firebase's nested 'ep' array structure
-- Each row represents one episode with its metadata
-- ============================================
CREATE TABLE `manga_episodes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `manga_id` INT NOT NULL,
  `episode` INT NOT NULL COMMENT 'Episode number (1, 2, 3, etc.)',
  `episode_name` VARCHAR(255) DEFAULT NULL,
  `view` BIGINT DEFAULT 0,
  `total_pages` INT DEFAULT 0 COMMENT 'Number of pages/images in this episode',
  `created_date` DATE,
  `updated_date` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`manga_id`) REFERENCES `manga`(`manga_id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_manga_episode` (`manga_id`, `episode`),
  INDEX idx_manga_id (`manga_id`),
  INDEX idx_episode (`episode`),
  INDEX idx_view (`view` DESC),
  INDEX idx_created_date (`created_date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. EPISODES TABLE (Alternative structure)
-- If you prefer to store episode images in the database instead of Firebase Storage
-- This stores the actual image URLs/paths for each episode
-- ============================================
CREATE TABLE `episodes` (
  `episode_id` INT AUTO_INCREMENT PRIMARY KEY,
  `manga_id` INT NOT NULL,
  `manga_slug` VARCHAR(255) NOT NULL,
  `episode` INT NOT NULL,
  `page_number` INT NOT NULL COMMENT 'Page number within the episode (1, 2, 3...)',
  `image_url` VARCHAR(500) NOT NULL COMMENT 'Full URL or path to the image',
  `image_filename` VARCHAR(255) NOT NULL COMMENT 'Original filename like page1.jpg',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`manga_id`) REFERENCES `manga`(`manga_id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_episode_page` (`manga_id`, `episode`, `page_number`),
  INDEX idx_manga_episode (`manga_id`, `episode`),
  INDEX idx_manga_slug (`manga_slug`),
  INDEX idx_page_number (`page_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. COMMENT_ON_EPISODE TABLE
-- Stores user comments on specific episodes
-- Used in MangaEpisodeComments component
-- ============================================
CREATE TABLE `comment_on_episode` (
  `comment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `manga_id` VARCHAR(100) NOT NULL COMMENT 'Manga document ID from Firebase or manga_id',
  `episode` VARCHAR(50) NOT NULL COMMENT 'Episode identifier like "ep1", "ep2"',
  `commenter` VARCHAR(100) NOT NULL,
  `comment` TEXT NOT NULL,
  `status` ENUM('pending', 'published', 'rejected') DEFAULT 'published',
  `created_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_manga_episode (`manga_id`, `episode`),
  INDEX idx_status (`status`),
  INDEX idx_created_date (`created_date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. RECOMMEND TABLE
-- Stores manga recommendations/reviews from users
-- Used in /api/recommend route and RecommendFormComponent
-- ============================================
CREATE TABLE `recommend` (
  `recommend_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL COMMENT 'Manga name',
  `slug` VARCHAR(255) NOT NULL COMMENT 'Manga slug',
  `commenter` VARCHAR(100) NOT NULL,
  `comment` TEXT NOT NULL,
  `background_image` VARCHAR(500),
  `status` ENUM('pending', 'published', 'rejected') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (`slug`),
  INDEX idx_status (`status`),
  INDEX idx_created_at (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. ADVERTISE TABLE
-- Stores advertisement banners displayed on the site
-- Used in AdvertiseComponent and admin page
-- ============================================
CREATE TABLE `advertise` (
  `ad_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `image` VARCHAR(500) NOT NULL,
  `link_url` VARCHAR(500),
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_date` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. MENUBAR TABLE
-- Stores navigation menu items
-- Used in /api/menubar route and HeaderComponent
-- ============================================
CREATE TABLE `menubar` (
  `menu_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `href` VARCHAR(500) NOT NULL,
  `id` INT COMMENT 'Menu item order/identifier',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_id (`id`),
  INDEX idx_is_active (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. USERS TABLE
-- Stores user accounts for admin access and future user features
-- Currently uses localStorage for login, can be migrated to proper auth
-- ============================================
CREATE TABLE `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) COMMENT 'Hashed password using bcrypt',
  `display_name` VARCHAR(100),
  `role` ENUM('admin', 'user') DEFAULT 'user',
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_login` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (`email`),
  INDEX idx_role (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. SESSIONS TABLE
-- Stores user login sessions (to replace localStorage token storage)
-- ============================================
CREATE TABLE `sessions` (
  `session_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX idx_token (`token`),
  INDEX idx_expires_at (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. FAVORITE_MANGA TABLE
-- Currently using localStorage, but this allows migration to server-side favorites
-- ============================================
CREATE TABLE `favorite_manga` (
  `favorite_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `manga_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`manga_id`) REFERENCES `manga`(`manga_id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_manga` (`user_id`, `manga_id`),
  INDEX idx_user_id (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SAMPLE DATA INSERTION
-- Insert example data for testing
-- ============================================

-- Insert sample tags
INSERT INTO `tags` (`tag_name`) VALUES
('แฟนตาซี'),
('รักโรแมนติก'),
('แอคชั่น'),
('ตลก'),
('ดราม่า'),
('สืบสวน'),
('สยองขวัญ'),
('ไซไฟ'),
('กีฬา'),
('ผจญภัย'),
('โรงเรียน'),
('ต่างโลก'),
('มหาเวทย์'),
('ฮาเร็ม');

-- Insert sample manga
INSERT INTO `manga` (`manga_name`, `manga_slug`, `manga_disc`, `manga_bg_img`, `tag_id`, `view`) VALUES
(
  'หนึ่งเดียวในใจ', 
  'หนึ่งเดียวในใจ-1-vision-1', 
  'เรื่องราวความรักที่น่าประทับใจระหว่างนักเรียนมัธยมปลาย ที่พบรักแท้ในช่วงเวลาที่สวยงามที่สุดของวัยเรียน', 
  'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fone-vision%2Fcover.jpg?alt=media', 
  '["รักโรแมนติก","ดราม่า","โรงเรียน"]', 
  15420
),
(
  'ผจญภัยในโลกแฟนตาซี', 
  'adventure-in-fantasy-world', 
  'การผจญภัยครั้งยิ่งใหญ่ของเหล่าผู้กล้าในโลกที่เต็มไปด้วยเวทมนตร์และสิ่งมหัศจรรย์', 
  'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fadventure%2Fcover.jpg?alt=media', 
  '["แฟนตาซี","ผจญภัย","แอคชั่น"]', 
  28350
),
(
  'เกิดใหม่เป็นผู้กล้า', 
  'reborn-as-hero', 
  'เรื่องราวของคนธรรมดาที่ตายแล้วเกิดใหม่ในโลกแฟนตาซีกลายเป็นผู้กล้าที่จะต้องปกป้องโลก', 
  'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Freborn%2Fcover.jpg?alt=media', 
  '["ต่างโลก","แฟนตาซี","แอคชั่น"]', 
  42100
);

-- Insert sample episodes for manga_episodes (nested structure compatible with Firebase)
INSERT INTO `manga_episodes` (`manga_id`, `episode`, `episode_name`, `view`, `total_pages`, `created_date`, `updated_date`) VALUES
(1, 1, 'ตอนที่ 1: จุดเริ่มต้น', 5420, 32, '2024-01-15', '2024-01-15'),
(1, 2, 'ตอนที่ 2: การพบกัน', 4230, 28, '2024-01-22', '2024-01-22'),
(1, 3, 'ตอนที่ 3: ความรู้สึกใหม่', 3890, 30, '2024-01-29', '2024-01-29'),
(1, 4, 'ตอนที่ 4: คำสารภาพ', 3120, 26, '2024-02-05', '2024-02-05'),
(2, 1, 'ตอนที่ 1: โลกใหม่', 8900, 35, '2024-01-10', '2024-01-10'),
(2, 2, 'ตอนที่ 2: การผจญภัย', 7650, 33, '2024-01-17', '2024-01-17'),
(2, 3, 'ตอนที่ 3: ศัตรูแรก', 6890, 31, '2024-01-24', '2024-01-24'),
(3, 1, 'ตอนที่ 1: การเกิดใหม่', 12300, 40, '2024-02-01', '2024-02-01'),
(3, 2, 'ตอนที่ 2: พลังใหม่', 10800, 38, '2024-02-08', '2024-02-08');

-- Insert sample episode pages/images (if storing in database instead of Firebase Storage)
INSERT INTO `episodes` (`manga_id`, `manga_slug`, `episode`, `page_number`, `image_url`, `image_filename`) VALUES
-- Episode 1 of manga 1
(1, 'หนึ่งเดียวในใจ-1-vision-1', 1, 1, 'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fone-vision%2Fep1%2Fpage1.jpg?alt=media', 'page1.jpg'),
(1, 'หนึ่งเดียวในใจ-1-vision-1', 1, 2, 'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fone-vision%2Fep1%2Fpage2.jpg?alt=media', 'page2.jpg'),
(1, 'หนึ่งเดียวในใจ-1-vision-1', 1, 3, 'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fone-vision%2Fep1%2Fpage3.jpg?alt=media', 'page3.jpg'),
-- Episode 2 of manga 1
(1, 'หนึ่งเดียวในใจ-1-vision-1', 2, 1, 'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fone-vision%2Fep2%2Fpage1.jpg?alt=media', 'page1.jpg'),
(1, 'หนึ่งเดียวในใจ-1-vision-1', 2, 2, 'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fone-vision%2Fep2%2Fpage2.jpg?alt=media', 'page2.jpg'),
-- Episode 1 of manga 2
(2, 'adventure-in-fantasy-world', 1, 1, 'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fadventure%2Fep1%2Fpage1.jpg?alt=media', 'page1.jpg'),
(2, 'adventure-in-fantasy-world', 1, 2, 'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fadventure%2Fep1%2Fpage2.jpg?alt=media', 'page2.jpg');

-- Insert sample comments
INSERT INTO `comment_on_episode` (`manga_id`, `episode`, `commenter`, `comment`, `status`) VALUES
('1', 'ep1', 'สมชาย', 'เรื่องนี้น่าสนใจมากเลยครับ ชอบมาก!', 'published'),
('1', 'ep1', 'นันทิดา', 'ภาพสวยมาก ๆ เลยค่ะ รอตอนต่อไป', 'published'),
('1', 'ep2', 'วิชัย', 'ตอนนี้สนุกดี ลุ้นเลย', 'published'),
('2', 'ep1', 'ปริญญา', 'โคตรเจ๋ง! ผจญภัยสุดมันส์', 'published');

-- Insert sample recommendations
INSERT INTO `recommend` (`name`, `slug`, `commenter`, `comment`, `background_image`, `status`) VALUES
(
  'หนึ่งเดียวในใจ', 
  'หนึ่งเดียวในใจ-1-vision-1', 
  'อรุณี',
  'มังงะเรื่องนี้น่ารักมากค่ะ เหมาะกับคนชอบเรื่องรักโรแมนติก แนะนำเลยค่ะ',
  'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fone-vision%2Fcover.jpg?alt=media',
  'published'
),
(
  'ผจญภัยในโลกแฟนตาซี', 
  'adventure-in-fantasy-world', 
  'สมศักดิ์',
  'เรื่องนี้ Action ดีมาก วาดสวย โคตรเจ๋ง ต้องอ่าน!',
  'https://firebasestorage.googleapis.com/v0/b/manga-ara.appspot.com/o/images%2Fadventure%2Fcover.jpg?alt=media',
  'published'
);

-- Insert sample advertisements
INSERT INTO `advertise` (`name`, `image`, `link_url`, `is_active`, `created_date`) VALUES
('Banner หน้าแรก 1', 'https://example.com/ads/banner1.jpg', 'https://example.com/promotion1', TRUE, '2024-01-01'),
('Banner หน้าแรก 2', 'https://example.com/ads/banner2.jpg', 'https://example.com/promotion2', TRUE, '2024-01-01'),
('Sidebar Banner', 'https://example.com/ads/sidebar.jpg', 'https://example.com/promotion3', TRUE, '2024-01-05');

-- Insert sample menubar items
INSERT INTO `menubar` (`name`, `href`, `id`, `is_active`) VALUES
('หน้าแรก', '/', 1, TRUE),
('มังงะทั้งหมด', '/mangas', 2, TRUE),
('แท็ก', '/tags', 3, TRUE),
('แนะนำมังงะ', '/recommend', 4, TRUE),
('เกี่ยวกับเรา', '/about', 5, TRUE);

-- Insert sample admin user (password: admin123 - hash this in production!)
INSERT INTO `users` (`email`, `password_hash`, `display_name`, `role`, `is_active`) VALUES
('admin@mangaara.com', '$2b$10$XQqvvvvvvvvvvvvvvvvvvO', 'Admin', 'admin', TRUE),
('user@example.com', '$2b$10$YYYYYYYYYYYYYYYYYYYYYe', 'Test User', 'user', TRUE);

-- ============================================
-- USEFUL QUERIES FOR YOUR APPLICATION
-- ============================================

-- ============================================
-- 1. Get manga with all episodes (replaces Firebase manga.ep array structure)
-- ============================================
/*
SELECT 
  m.manga_id, 
  m.manga_name, 
  m.manga_slug,
  m.manga_disc,
  m.manga_bg_img,
  m.tag_id,
  m.view as manga_view,
  JSON_ARRAYAGG(
    JSON_OBJECT(
      'episode', me.episode,
      'episode_name', me.episode_name,
      'view', me.view,
      'created_date', me.created_date,
      'updated_date', me.updated_date
    )
  ) as ep
FROM manga m
LEFT JOIN manga_episodes me ON m.manga_id = me.manga_id
WHERE m.manga_slug = 'หนึ่งเดียวในใจ-1-vision-1'
GROUP BY m.manga_id;
*/

-- ============================================
-- 2. Get all manga with episode counts (for manga list page)
-- ============================================
/*
SELECT 
  m.manga_id, 
  m.manga_name, 
  m.manga_slug,
  m.manga_bg_img,
  m.tag_id,
  m.view,
  COUNT(me.id) as episode_count,
  MAX(me.created_date) as last_episode_date
FROM manga m
LEFT JOIN manga_episodes me ON m.manga_id = me.manga_id
GROUP BY m.manga_id
ORDER BY m.view DESC;
*/

-- ============================================
-- 3. Get episode images for reading (API: /api/[manga]/[ep])
-- ============================================
/*
SELECT 
  episode_id,
  page_number,
  image_url,
  image_filename
FROM episodes
WHERE manga_slug = 'หนึ่งเดียวในใจ-1-vision-1' AND episode = 1
ORDER BY page_number ASC;
*/

-- ============================================
-- 4. Get latest episodes across all manga (for homepage)
-- ============================================
/*
SELECT 
  me.id,
  me.episode,
  me.created_date,
  m.manga_name,
  m.manga_slug,
  m.manga_bg_img
FROM manga_episodes me
JOIN manga m ON me.manga_id = m.manga_id
ORDER BY me.created_date DESC
LIMIT 20;
*/

-- ============================================
-- 5. Get comments for specific episode with published status
-- ============================================
/*
SELECT 
  comment_id,
  commenter,
  comment,
  created_date,
  updated_date
FROM comment_on_episode
WHERE manga_id = '1' 
  AND episode = 'ep1' 
  AND status = 'published'
ORDER BY created_date DESC;
*/

-- ============================================
-- 6. Get manga by tag (search functionality)
-- ============================================
/*
SELECT 
  manga_id,
  manga_name,
  manga_slug,
  manga_bg_img,
  tag_id,
  view
FROM manga
WHERE JSON_CONTAINS(tag_id, '"รักโรแมนติก"')
ORDER BY view DESC;
*/

-- ============================================
-- 7. Get most viewed manga (trending/popular)
-- ============================================
/*
SELECT 
  manga_id,
  manga_name,
  manga_slug,
  manga_bg_img,
  view
FROM manga
ORDER BY view DESC
LIMIT 10;
*/

-- ============================================
-- 8. Increment manga view count (for ViewTracker component)
-- ============================================
/*
UPDATE manga 
SET view = view + 1 
WHERE manga_id = 1;
*/

-- ============================================
-- 9. Increment episode view count (for ViewTrackerForEP component)
-- ============================================
/*
UPDATE manga_episodes 
SET view = view + 1 
WHERE manga_id = 1 AND episode = 1;
*/

-- ============================================
-- 10. Get published recommendations
-- ============================================
/*
SELECT 
  recommend_id,
  name,
  slug,
  commenter,
  comment,
  background_image,
  created_at
FROM recommend
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 10;
*/

-- ============================================
-- 11. Search manga by name (for search functionality)
-- ============================================
/*
SELECT 
  manga_id,
  manga_name,
  manga_slug,
  manga_bg_img,
  view
FROM manga
WHERE MATCH(manga_name) AGAINST('หนึ่ง' IN NATURAL LANGUAGE MODE)
   OR manga_name LIKE '%หนึ่ง%'
ORDER BY view DESC;
*/

-- ============================================
-- 12. Get user's favorite manga (if migrating from localStorage)
-- ============================================
/*
SELECT 
  m.manga_id,
  m.manga_name,
  m.manga_slug,
  m.manga_bg_img,
  m.view,
  COUNT(me.id) as episode_count
FROM favorite_manga fm
JOIN manga m ON fm.manga_id = m.manga_id
LEFT JOIN manga_episodes me ON m.manga_id = me.manga_id
WHERE fm.user_id = 1
GROUP BY m.manga_id
ORDER BY fm.created_at DESC;
*/

-- ============================================
-- NOTES AND MIGRATION GUIDE
-- ============================================
/*
IMPORTANT NOTES FOR FIREBASE TO MYSQL MIGRATION:

1. DATA STRUCTURE COMPATIBILITY:
   - `manga` table uses JSON for `tag_id` array (same as Firebase)
   - `manga_episodes` table replaces Firebase's nested `ep` array
   - Use JSON_ARRAYAGG to recreate the Firebase structure in queries

2. EPISODE IMAGES:
   - Two options provided:
     a) Store in `episodes` table (one row per page/image)
     b) Keep in Firebase Storage, reference URLs in `manga_episodes.total_pages`
   - Recommendation: Keep images in storage (Firebase/S3), store URLs in DB

3. VIEW TRACKING:
   - Replace Firestore increment() with SQL UPDATE ... SET view = view + 1
   - Use transactions for concurrent updates
   - Consider caching view counts (Redis) for high traffic

4. AUTHENTICATION:
   - Replace Firebase Auth with JWT tokens
   - Use `sessions` table for token management
   - Hash passwords with bcrypt (bcryptjs npm package)

5. FILE UPLOADS:
   - Can continue using Firebase Storage
   - Or migrate to local storage / S3 / Cloudinary
   - Update image URLs in database accordingly

6. REAL-TIME FEATURES:
   - Firebase real-time: Replace with polling or WebSockets
   - Consider Socket.io for real-time comments

7. NEXT STEPS:
   - Update API routes to use MySQL instead of Firestore
   - Replace Firebase SDK with MySQL2 package
   - Update environment variables (.env file)
   - Test all CRUD operations
   - Migrate existing Firebase data using export/import scripts

8. PERFORMANCE OPTIMIZATIONS:
   - Add indexes on frequently queried columns (already included)
   - Consider read replicas for scaling
   - Implement caching layer (Redis)
   - Use connection pooling (mysql2/promise)

9. BACKUP STRATEGY:
   - Regular MySQL backups (mysqldump or automated backups)
   - Point-in-time recovery setup
   - Test restore procedures

10. ENVIRONMENT VARIABLES NEEDED:
    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=your_user
    DB_PASSWORD=your_password
    DB_NAME=manga_ara
*/

-- ============================================
-- END OF SCHEMA
-- ============================================
