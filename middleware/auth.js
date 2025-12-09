const db = require('../db');

// Middleware to verify session token
async function requireAuth(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-auth-token'];

    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const [sessions] = await db.execute(
            `SELECT s.session_id, s.expires_at, u.user_id, u.email, u.display_name, u.role, u.is_active
             FROM sessions s
             JOIN users u ON s.user_id = u.user_id
             WHERE s.token = ?`,
            [token]
        );

        if (sessions.length === 0) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const session = sessions[0];

        // Check if token is expired
        if (new Date(session.expires_at) < new Date()) {
            await db.execute('DELETE FROM sessions WHERE token = ?', [token]);
            return res.status(401).json({ error: 'Token expired' });
        }

        // Check if user is active
        if (!session.is_active) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Attach user to request
        req.user = {
            user_id: session.user_id,
            email: session.email,
            display_name: session.display_name,
            role: session.role
        };

        next();
    } catch (err) {
        console.error("[Error verifying token]", err.message);
        res.status(500).json({ error: "Authentication error" });
    }
}

// Middleware to require admin role
function requireAdmin(req, res, next) {
    // First check if user is authenticated via session
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    // Fallback to API key for backwards compatibility
    const apiKey = req.headers['x-api-key'];
    const validToken = process.env.ADMIN_API_KEY;

    if (apiKey && validToken && apiKey === validToken) {
        return next();
    }

    res.status(403).json({ error: "Unauthorized - Admin access required" });
}

// Middleware to require specific user or admin
function requireUserOrAdmin(req, res, next) {
    const userId = parseInt(req.params.id || req.params.user_id);
    
    if (req.user && (req.user.user_id === userId || req.user.role === 'admin')) {
        return next();
    }

    res.status(403).json({ error: "Unauthorized - You can only access your own resources" });
}

module.exports = { requireAuth, requireAdmin, requireUserOrAdmin };
