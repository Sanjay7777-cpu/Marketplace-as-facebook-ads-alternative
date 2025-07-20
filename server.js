// Required Modules
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const router = express.Router();
const session = require('express-session');

const verifyTokens = require('./middleware/auth'); // if used inside businessRoutes
const Business = require('./models/Business');
const businessRoutes = require('./routes/business');

const User = require('./models/user');
const JWT_SECRET = "superkey@^%^";
const { isAuthenticated } = require('./middleware/auth');

const app = express();

// --------------------- MIDDLEWARE SETUP ---------------------

// Static files & View Engine
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/business', businessRoutes);


// Parsers (order is important)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Single Session Middleware (configured once)
app.use(session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 20 * 60 * 1000, // 20 seconds (adjust as needed)
        secure: false // false if using HTTP (set to true with HTTPS)
    }
}));

// --------------------- BUSINESS ROUTES ---------------------
app.use(businessRoutes);

// Global middleware to pass user info into all views from the JWT token (if available)
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        res.locals.user = req.session.user;
    } else {
        res.locals.user = null;
    }
    next();
});

// --------------------- AUTHENTICATION MIDDLEWARE ---------------------

// Use verifyToken middleware to protect routes using JWT
function verifyToken(req, res, next) {
    if (req.session && req.session.user) {
        req.user = req.session.user; // 👈 This line sets req.user for compatibility
        next();
    } else {
        res.redirect('/login');
    }
}

async function registerBusiness(userId, body, file) {
    const { name, description, category, contact, address } = body;
    const image = file ? `uploads/${file.filename}` : '';

    // Check if the user already has a business
    const existingBusiness = await Business.findOne({ userId });
    if (existingBusiness) {
        throw new Error('You have already registered a business.');
    }

    // Create the new business with userId
    const newBusiness = new Business({
        userId,
        name,
        description,
        category,
        contact,
        address,
        image,
        owner: userId,
    });

    await newBusiness.save();
}

// --------------------- ROUTES ---------------------

// Home Route (consolidated; render index with session info)
app.get('/', (req, res) => {
    const isAuthenticated = !!req.session.user;
    // Pass both session user and a boolean flag to your view
    res.render('index', { user: req.session.user, isAuthenticated });
});

// Registration Routes
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async(req, res) => {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.send('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();
    res.redirect('/login');
});




// Login Routes
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard'); // Redirect logged-in users to dashboard
    }
    res.render('login'); // Show login page if not logged in
});

app.post('/login', async(req, res) => {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) return res.send('Invalid email or password');

    // Validate the password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.send('Invalid email or password');

    // Store user info in session for authentication
    req.session.user = {
        _id: user._id, // Store user ID as _id
        email: user.email
    };

    // Redirect to home page
    res.redirect('/');
});

// Set up storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/'); // make sure this folder exists
    },
    filename: function(req, file, cb) {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });
app.post('/register-business', upload.single('image'), async(req, res) => {
    try {
        const userId = req.session.user._id;

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


app.get('/dashboard', (req, res) => {
    const successMessage = req.query.success || null;
    const errorMessage = req.query.error || null;
    res.render('dashboard', { successMessage, errorMessage });
});




app.get('/dashboard', verifyToken, async(req, res) => {
    const user = await User.findById(req.user.id); // Fetch user info (if necessary)
    const business = await Business.findOne({ user: req.user.id }); // Fetch business related to this user

    if (!user) return res.redirect('/login'); // If no user, redirect to login

    res.render('dashboard', { user, business }); // Pass the business to the view
});



// Logout Route: clear token cookie and destroy session
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid'); // or your session cookie name
        res.redirect('/login');
    });
});



// Protected Route for Business Creation
app.get('/create-business', verifyToken, (req, res) => {
    res.send("Business Profile Creation Page (Coming Soon!)");
});

// --------------------- MULTER SETUP ---------------------



// --------------------- DATABASE CONNECTION ---------------------

mongoose.connect('mongodb://127.0.0.1:27017/marketplace', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

// --------------------- SERVER START ---------------------

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});