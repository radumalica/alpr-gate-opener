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

app.listen(3002, () => {
    console.log('Backend service running on port 3002');
});
