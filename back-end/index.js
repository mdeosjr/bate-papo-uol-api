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
    db = mongoClient.db("salaBatePapo")
})
const hour = dayjs().locale('pt-br').format('HH:mm:ss')

setInterval(async () => {
    const participants = await db.collection("participants").find({}).toArray();
    const lastStatusNow = Date.now();

    participants.filter(participant => participant.lastStatus < lastStatusNow - 10000)
                .map(participant => {
                    db.collection("participants").deleteOne({ lastStatus: participant.lastStatus });
                    db.collection("messages").insertOne({ from: participant.name, to: 'Todos', text: 'sai da sala...', type: 'status', hour })
                })
}, 15000)

server.post('/participants', async (req, res) => {
    const name = req.body.name;
    const message = {
        from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: hour
    };
    const participant = await db.collection("participants").findOne({ name: name });
    const validation = Joi.attempt(name, Joi.string().required())
    
    if (participant) {
        res.sendStatus(409);
        return
    }

    if (validation.error) {
        res.sendStatus(422);
        return
    }

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

server.post('/messages', async (req, res) => {
    const user = req.headers.User;
    const textUser = req.body;
    const message = {...textUser, from: user, time: hour};
    const participant = await db.collection("participants").findOne({ name: user });

    const messageSchema = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().required().valid('message', 'private_message'),
    })

    const validation = messageSchema.validate(textUser, { abortEarly: false });
    if (validation.error || !participant) {
        res.status(422).send(validation.error);
        return
    }

    try {
        await db.collection("messages").insertOne(message)
        res.sendStatus(201);
        db.close();
    } catch {
        res.sendStatus(422);
        db.close();
    }
})

server.get('/messages', async (req, res) => {
    const messages = await db.collection("messages").find({}).toArray();
    res.send(messages)
})

server.listen(4000);

//mongod --dbpath ~/.mongo