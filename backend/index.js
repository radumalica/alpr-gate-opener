require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const logger = require('./utils/logger');
const { exec } = require('child_process');

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

// Middleware to check API Token
app.use(async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) { console.log(req.headers, token)}
    if (!token && req.originalUrl !== '/check_plate') {
        return res.status(403).send('Forbidden');
    }
    if (token) {
        const tokenExists = await Token.findOne({ token });
        if (!tokenExists) {
            return res.status(403).send('Forbidden');
        }
    }
    next();
});

// Endpoint to check if a plate is authorized
app.post('/check_plate', async (req, res) => {
    const plate = req.body.plate;
    const auth = await Auth.findOne({ plate, enabled: true });
    const status = auth ? 'allowed' : 'denied';

    if (status === 'allowed') {
        exec('echo', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing gate command: ${error}`);
                return;
            }
            console.log(`Gate activated: ${stdout}, plate ${plate} authorized`);
        });
    }

    const log = new Log({ plate, datetime: new Date().toISOString(), status });
    await log.save();

    res.json({ status });
});

// Endpoint to log plate detection attempts
app.post('/log', async (req, res) => {
    const { plate, datetime, status } = req.body;
    const log = new Log({ plate, datetime, status });
    await log.save();
    res.json({ message: 'Logged' });
});

// Admin endpoints
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

app.post('/admin/toggle_plate', async (req, res) => {
    const { plate } = req.body;
    const auth = await Auth.findOne({ plate });
    if (auth) {
        auth.enabled = !auth.enabled;
        await auth.save();
    }
    res.json({ message: 'Plate toggled' });
});

app.get('/admin/logs', async (req, res) => {
    const logs = await Log.find().sort({ datetime: -1 });
    res.json(logs);
});

app.post('/admin/delete_logs', async (req, res) => {
    await Log.deleteMany({});
    res.json({ message: 'Logs deleted' });
});

app.post('/admin/create_token', async (req, res) => {
    const { token } = req.body;
    const newToken = new Token({ token });
    await newToken.save();
    res.json({ message: 'Token created' });
});

app.post('/admin/delete_token', async (req, res) => {
    const { token } = req.body;
    await Token.deleteOne({ token });
    res.json({ message: 'Token deleted' });
});

app.listen(3002, () => {
    console.log('Backend service running on port 3002');
});
