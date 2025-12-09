# Firebase to MySQL Migration Guide

Step-by-step guide to migrate your Manga-Ara application from Firebase to MySQL.

## 📋 Pre-Migration Checklist

- [ ] Backup all Firebase data
- [ ] Export Firebase Storage files
- [ ] Document current Firebase rules and security
- [ ] Set up MySQL database
- [ ] Test MySQL backend locally
- [ ] Prepare migration scripts

## 🔄 Migration Steps

### Step 1: Export Firebase Data

#### Using Firebase Console
1. Go to Firestore Database
2. Click on "Import/Export"
3. Export to Cloud Storage bucket
4. Download the exported data

#### Using Firebase CLI
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Export Firestore data
firebase firestore:export gs://your-bucket/exports
```

### Step 2: Transform Firebase Data to MySQL Format

Create a migration script to transform Firebase JSON to MySQL SQL:

```javascript
// migration.js
const fs = require('fs');
const mysql = require('mysql2/promise');

async function migrateManga(firebaseData) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'mangaa_admin',
    password: 'your_password',
    database: 'manga_ara'
  });

  for (const manga of firebaseData.mangas) {
    // Insert manga
    const [mangaResult] = await connection.execute(
      'INSERT INTO manga (manga_name, manga_slug, manga_disc, manga_bg_img, tag_id, view) VALUES (?, ?, ?, ?, ?, ?)',
      [
        manga.manga_name,
        manga.manga_slug,
        manga.manga_disc,
        manga.manga_bg_img,
        JSON.stringify(manga.tag_id || []),
        manga.view || 0
      ]
    );

    const mangaId = mangaResult.insertId;

    // Insert episodes
    if (manga.ep && Array.isArray(manga.ep)) {
      for (const episode of manga.ep) {
        await connection.execute(
          'INSERT INTO manga_episodes (manga_id, episode, episode_name, view, total_pages, created_date, updated_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            mangaId,
            episode.episode,
            episode.episode_name || `Episode ${episode.episode}`,
            episode.view || 0,
            episode.totalPage || 0,
            episode.created_date || new Date(),
            episode.updated_date || new Date()
          ]
        );
      }
    }
  }

  await connection.end();
  console.log('Migration completed!');
}

// Load Firebase exported data
const firebaseData = JSON.parse(fs.readFileSync('./firebase-export.json', 'utf8'));
migrateManga(firebaseData);
```

### Step 3: Migrate Firebase Storage to Local/S3

#### Option A: Keep Firebase Storage
- Continue using Firebase Storage URLs
- No changes needed to image references

#### Option B: Download and Host Locally
```bash
# Download all images
gsutil -m cp -r gs://your-bucket/images ./images

# Move to web server directory
sudo cp -r ./images /var/www/vhosts/mangaara.com/httpdocs/
```

#### Option C: Migrate to AWS S3
```bash
# Install AWS CLI
aws configure

# Sync from Firebase to S3
gsutil -m rsync -r gs://your-bucket/images s3://your-s3-bucket/images
```

### Step 4: Update Frontend Code

#### Replace Firebase SDK
```javascript
// Before (Firebase)
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const db = getFirestore();
const mangaSnapshot = await getDocs(collection(db, 'mangas'));

// After (MySQL API)
const response = await fetch('https://api.mangaara.com/api/mangas');
const manga = await response.json();
```

#### Update Authentication
```javascript
// Before (Firebase Auth)
import { signInWithEmailAndPassword } from 'firebase/auth';
const userCredential = await signInWithEmailAndPassword(auth, email, password);

// After (MySQL API)
const response = await fetch('https://api.mangaara.com/api/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await response.json();
localStorage.setItem('authToken', token);
```

#### Update Real-time Listeners
```javascript
// Before (Firebase Real-time)
onSnapshot(doc(db, 'mangas', id), (doc) => {
  console.log('Updated:', doc.data());
});

// After (Polling or WebSockets)
setInterval(async () => {
  const response = await fetch(`/api/mangas/${id}`);
  const manga = await response.json();
  updateUI(manga);
}, 5000);
```

### Step 5: Update Image Uploads

#### Before (Firebase Storage)
```javascript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
const storageRef = ref(storage, `images/${file.name}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

#### After (Multer Upload)
```javascript
const formData = new FormData();
formData.append('manga_bg_img', file);
formData.append('manga_name', 'My Manga');

const response = await fetch('/api/mangas', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

## 🔍 Data Mapping Reference

### Manga Collection
| Firebase Field | MySQL Table | MySQL Column |
|----------------|-------------|--------------|
| `manga_name` | `manga` | `manga_name` |
| `manga_slug` | `manga` | `manga_slug` |
| `manga_disc` | `manga` | `manga_disc` |
| `manga_bg_img` | `manga` | `manga_bg_img` |
| `tag_id` (array) | `manga` | `tag_id` (JSON) |
| `ep` (array) | `manga_episodes` | Multiple rows |
| `view` | `manga` | `view` |

### Episode Nested Data
| Firebase `ep[i]` | MySQL Table | MySQL Column |
|------------------|-------------|--------------|
| `episode` | `manga_episodes` | `episode` |
| `episode_name` | `manga_episodes` | `episode_name` |
| `totalPage` | `manga_episodes` | `total_pages` |
| `view` | `manga_episodes` | `view` |
| `created_date` | `manga_episodes` | `created_date` |

## 📊 Verification Steps

### 1. Check Record Counts
```sql
-- Compare counts
SELECT COUNT(*) as manga_count FROM manga;
SELECT COUNT(*) as episode_count FROM manga_episodes;
SELECT COUNT(*) as comment_count FROM comment_on_episode;

-- Verify relationships
SELECT m.manga_name, COUNT(me.id) as episodes
FROM manga m
LEFT JOIN manga_episodes me ON m.manga_id = me.manga_id
GROUP BY m.manga_id;
```

### 2. Test API Endpoints
```bash
# Test manga listing
curl https://api.mangaara.com/api/mangas

# Test specific manga
curl https://api.mangaara.com/api/mangas/1

# Test search
curl https://api.mangaara.com/api/mangas/search/fantasy

# Test authentication
curl -X POST https://api.mangaara.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Verify Images Load
```bash
# Check image accessibility
curl -I https://mangaara.com/images/manga/sample/cover.jpg

# Verify all image paths in database are accessible
SELECT manga_bg_img FROM manga WHERE manga_bg_img IS NOT NULL LIMIT 10;
```

## 🚨 Common Issues and Solutions

### Issue: Nested Arrays Not Working
**Problem:** Firebase used nested arrays in documents  
**Solution:** Use JSON_ARRAYAGG in MySQL queries
```sql
SELECT 
  m.*,
  JSON_ARRAYAGG(
    JSON_OBJECT('episode', me.episode, 'view', me.view)
  ) as ep
FROM manga m
LEFT JOIN manga_episodes me ON m.manga_id = me.manga_id
GROUP BY m.manga_id;
```

### Issue: Image Paths Changed
**Problem:** Firebase Storage URLs vs Local paths  
**Solution:** Update all image URLs in database
```sql
UPDATE manga 
SET manga_bg_img = REPLACE(
  manga_bg_img, 
  'https://firebasestorage.googleapis.com/...', 
  'https://mangaara.com/images'
);
```

### Issue: User Authentication Not Working
**Problem:** Firebase Auth tokens incompatible  
**Solution:** Users must re-login, old tokens won't work
- Display message asking users to login again
- Clear localStorage Firebase tokens
- Implement password reset flow

### Issue: Real-time Updates Stopped
**Problem:** No Firestore listeners  
**Solution:** Implement polling or WebSockets
```javascript
// Simple polling
function pollForUpdates() {
  setInterval(async () => {
    const response = await fetch('/api/mangas/latest/all');
    const episodes = await response.json();
    updateLatestEpisodes(episodes);
  }, 10000); // Poll every 10 seconds
}
```

## 📝 Post-Migration Checklist

- [ ] All data migrated and verified
- [ ] Image paths updated and working
- [ ] User accounts migrated (or ready for re-registration)
- [ ] Frontend updated to use new API
- [ ] Authentication flow working
- [ ] Search functionality working
- [ ] Comments system working
- [ ] Admin panel functional
- [ ] Performance testing completed
- [ ] Backup strategy in place
- [ ] Monitoring and logging configured
- [ ] SSL certificates installed
- [ ] CORS properly configured
- [ ] Rate limiting tested
- [ ] Security audit completed

## 🎯 Performance Optimization

### Add Database Indexes
```sql
-- Already included in schema, but verify:
SHOW INDEXES FROM manga;
SHOW INDEXES FROM manga_episodes;

-- Add custom indexes if needed
CREATE INDEX idx_custom ON manga (view DESC, created_at DESC);
```

### Enable Query Caching
```javascript
// Use Redis for caching
const redis = require('redis');
const client = redis.createClient();

router.get('/api/mangas', async (req, res) => {
  const cached = await client.get('all_manga');
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  const [rows] = await db.execute('SELECT * FROM manga');
  await client.setex('all_manga', 300, JSON.stringify(rows)); // Cache 5 min
  res.json(rows);
});
```

## 🔐 Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials not in git
- [ ] SQL injection protection (parameterized queries)
- [ ] Password hashing with bcrypt
- [ ] Session tokens expire appropriately
- [ ] CORS configured for specific domains
- [ ] Rate limiting enabled
- [ ] Helmet.js security headers
- [ ] HTTPS enforced
- [ ] File upload validation
- [ ] Input sanitization

## 📞 Support

If you encounter issues during migration:
1. Check the error logs
2. Review API documentation
3. Test with Postman/Thunder Client
4. Check database constraints
5. Verify network connectivity

## 🎉 Migration Complete!

Once verified, you can:
1. Decommission Firebase services (save costs!)
2. Update DNS if needed
3. Monitor performance
4. Gather user feedback
5. Optimize based on usage patterns

---

**Remember:** Keep Firebase backup for at least 30 days after migration!
