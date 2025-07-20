const jwt = require('jsonwebtoken');
const JWT_SECRET = "superkey@^%^"; // use an environment variable in production

function verifyToken(req, res, next) {
    // Debug: log the session to verify token storage
    console.log("Session:", req.session);

    // Retrieve the token from the session
    const token = req.session.token;

    if (!token) {
        return res.redirect('/login');
    }

    // Verify the token using jwt.verify
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.redirect('/login');
        }
        req.user = decoded;
        next();
    });
}

module.exports = verifyToken;