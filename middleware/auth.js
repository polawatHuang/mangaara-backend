function requireAdmin(req, res, next) {
    const token = req.headers['x-api-key'];
    const validToken = process.env.ADMIN_API_KEY;

    if (token && token === validToken) {
        return next();
    }

    res.status(403).json({ error: "Unauthorized" });
}
module.exports = { requireAdmin };