const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/user");
const router = express.Router();

// User Registration
router.post(
    "/register", [
        body("name").notEmpty().withMessage("Name is required"),
        body("email").isEmail().withMessage("Enter a valid email"),
        body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
        body("role").isIn(["client", "freelancer"]).withMessage("Invalid role"),
    ],
    async(req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { name, email, password, role } = req.body;

        try {
            let user = await User.findOne({ email });
            if (user) return res.status(400).json({ message: "User already exists" });

            const hashedPassword = await bcrypt.hash(password, 10);
            user = new User({ name, email, password: hashedPassword, role });

            await user.save();

            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

            res.json({ token, user: { id: user._id, name, email, role } });
        } catch (err) {
            res.status(500).json({ message: "Server error" });
        }
    }
);

// User Login
router.post(
    "/login", [
        body("email").isEmail().withMessage("Enter a valid email"),
        body("password").notEmpty().withMessage("Password is required"),
    ],
    async(req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { email, password } = req.body;

        try {
            const user = await User.findOne({ email });
            if (!user) return res.status(400).json({ message: "Invalid credentials" });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

            res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
        } catch (err) {
            res.status(500).json({ message: "Server error" });
        }
    }
);

module.exports = router;