const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken'); // Import jwt for verification
const Business = require('../models/Business');

const JWT_SECRET = "superkey@^%^"; // Ideally, use an environment variable in production

// Auth middleware using session token and JWT for verification
function isAuthenticated(req, res, next) {
    console.log('Session in isAuthenticated:', req.session); // Check session here
    // Check if the session exists and contains a token
    if (req.session && req.session.token) {
        // Verify the JWT token stored in the session
        jwt.verify(req.session.token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.redirect('/login');
            }
            // Store the decoded token payload (user data) in req.user for later use
            req.user = decoded;
            next();
        });
    } else {
        res.redirect('/login');
    }
}

// GET - Show the business registration form (only for authenticated users)
router.get('/register-business', isAuthenticated, (req, res) => {
    res.render('registerBusiness'); // render the page if authenticated
});

// Multer setup (for handling image uploads)
const storage = multer.diskStorage({
    destination: './public/uploads/', // Save images in the public/uploads folder
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});
const upload = multer({ storage });



router.get('/businesses', async(req, res) => {
    try {
        // Fetch all businesses from the database
        const businesses = await Business.find();

        // Render the businesses page and pass the businesses data
        res.render('businesses', { businesses });
    } catch (err) {
        console.error('Error fetching businesses:', err);
        res.status(500).send('Server Error');
    }
});


// POST - Handle form submission (only for authenticated users)
router.post('/dashboard', isAuthenticated, upload.single('image'), async(req, res) => {
    try {
        const userId = req.user._id || req.session.userId;

        if (!userId) {
            return res.status(400).send('User must be logged in to register a business.');
        }

        // Call the registerBusiness function
        await registerBusiness(userId, req.body, req.file);

        res.redirect('/dashboard?success=Business registered successfully');
    } catch (err) {
        console.error('Error registering business:', err);
        res.status(500).send('Something went wrong.');
    }
});




module.exports = router;