const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
    name: String,
    description: String,
    category: String,
    contact: String,
    address: String,
    image: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true, // Enforces one business per user
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
});



module.exports = mongoose.model('Business', BusinessSchema);