import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import Video from './models/Video.js';


const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI);


const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_HASH = process.env.ADMIN_HASH;


// LOGIN
app.post('/login', async (req, res) => {
const { username, password } = req.body;


if (username !== ADMIN_USER) return res.sendStatus(401);


const ok = await bcrypt.compare(password, ADMIN_HASH);
if (!ok) return res.sendStatus(401);


const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '2h' });
res.json({ token });
});


// AUTH MIDDLEWARE
function auth(req, res, next) {
const token = req.headers.authorization?.split(' ')[1];
if (!token) return res.sendStatus(401);


try {
jwt.verify(token, process.env.JWT_SECRET);
next();
} catch {
res.sendStatus(403);
}
}


// VIDEO'S
app.get('/videos', async (req, res) => {
res.json(await Video.find());
});


app.post('/videos', auth, async (req, res) => {
await Video.create(req.body);
res.sendStatus(201);
});


app.listen(3000);