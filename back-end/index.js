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
    try {
        const participants = await db.collection("participants").find({}).toArray();
        await db.collection("messages").find({});
        const lastStatusNow = Date.now();

        for (const participant of participants) {
            if (participant.lastStatus < lastStatusNow - 10000) {
                await db.collection("participants").deleteMany({ lastStatus: participant.lastStatus });
                await db.collection("messages").insertMany({ from: participant.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: hour })
            }
        }
    } catch (error) {
        console.log(error);
    }
   
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
    const user = req.headers.user;
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
    try {
        const limit = parseInt(req.query.limit)
        const messages = await db.collection("messages").find({}).toArray();
    
        if (!limit) {
            res.send(messages);
            db.close();
        }

        const endIndex = messages.length - 1;
        const startIndex = endIndex - limit;
        const limitedMessages = [...messages].slice(startIndex, endIndex);
        res.send(limitedMessages);
    } catch (error) {
        res.sendStatus(500)
    }
})

server.post('/status', async (req, res) => {
    const user = req.headers.user;
    const participant = await db.collection("participants").findOne({ name: user });
        
    if (!participant) {
        res.sendStatus(404);
        return;
    }

    try {
        await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() }});
        res.sendStatus(200)
    } catch {
        res.sendStatus(500)
    }
})

server.listen(5000);

//mongod --dbpath ~/.mongo