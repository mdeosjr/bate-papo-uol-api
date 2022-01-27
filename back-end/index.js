import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br.js'
import dotenv from 'dotenv';
dotenv.config();

const server = express();
server.use(cors());
server.use(json());

const mongoClient = new MongoClient(process.env.BATEPAPO_URI);
let db;
mongoClient.connect(() => {
    db = mongoClient.db("salaBatePapo");
})

server.post('/participants', async (req, res) => {
    const name = req.body.name;
    const hour = dayjs().locale('pt-br').format('HH:mm:ss')
    const message = {
        from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: hour
    }

    try {
        Joi.attempt(name, Joi.string());
        try {
            await db.collection("participants").insertOne({name, lastStatus: Date.now()});
            await db.collection("messages").insertOne(message)
            res.sendStatus(201);
            db.close();
        } catch  {
            res.sendStatus(500);
            console.log('Erro!');
            db.close();
        }
    } catch {
        res.sendStatus(422);
    }
});

server.get('/participants', async (req, res) => {
    try {
        const participants = await db.collection("participants").find({}).toArray();
        res.send(participants);
        db.close();
    } catch {
        res.sendStatus(500);
        console.log('Erro!');
        db.close();
    }
});

server.listen(4000);