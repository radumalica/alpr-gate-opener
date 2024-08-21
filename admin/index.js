const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
    logger.info('MongoDB connected');
  }).catch(error => {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  });
  

const logSchema = new mongoose.Schema({
    plate: String,
    datetime: String,
    status: String
});

const authSchema = new mongoose.Schema({
    plate: String,
    enabled: Boolean
});

const tokenSchema = new mongoose.Schema({
    token: String
});

const Log = mongoose.model('Log', logSchema);
const Auth = mongoose.model('Auth', authSchema);
const Token = mongoose.model('Token', tokenSchema);

const authenticate = (req, res, next) => {
    const { password } = req.body;
    
    if (password && password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        logger.error(`Authentication failed. Provided password: ${password}`);
        res.status(403).json({ message: 'Forbidden: Invalid password',password });
    }
};

app.post('/admin/create_token', authenticate, async (req, res) => {
    try {
        // Generate a new JWT token
        const newToken = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Save the JWT token to the database
        const tokenEntry = new Token({ token: newToken });
        await tokenEntry.save();

        res.json({ message: 'Token created', token: newToken });
    } catch (error) {
        logger.error(`Error creating token: ${error.message}`);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/admin/delete_token', async (req, res) => {
    const { token } = req.body;
    await Token.deleteOne({ token });
    res.json({ message: 'Token deleted' });
});

app.get('/admin/logs', async (req, res) => {
    const logs = await Log.find().sort({ datetime: -1 });
    res.json(logs);
});

app.post('/admin/delete_logs', async (req, res) => {
    await Log.deleteMany({});
    res.json({ message: 'Logs deleted' });
});

app.post('/admin/add_plate', async (req, res) => {
    const { plate } = req.body;
    const auth = new Auth({ plate, enabled: true });
    await auth.save();
    res.json({ message: 'Plate added' });
});

app.post('/admin/remove_plate', async (req, res) => {
    const { plate } = req.body;
    await Auth.deleteOne({ plate });
    res.json({ message: 'Plate removed' });
});

app.post('/admin/get_plates', async (req, res) => {
    const plates = await Auth.find()
    res.json(plates);
});

app.post('/admin/toggle_plate', async (req, res) => {
    const { plate } = req.body;
    const auth = await Auth.findOne({ plate });
    if (auth) {
        auth.enabled = !auth.enabled;
        await auth.save();
    }
    res.json({ message: 'Plate toggled' });
});

app.listen(3003, () => {
    console.log('Administration service running on port 3003');
});
