import express, { json } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs'
import dotenv from 'dotenv';
dotenv.config();

const server = express();
server.use(cors());
server.use(json());

async function mongoConnect() {
    try {
        const mongoClient = new MongoClient(process.env.BATEPAPO_URI);
        await mongoClient.connect();
        const db = mongoClient.db("salaBatePapo")
        return { mongoClient, db };
    } catch (error) {
        console.error(error)
    }
};

setInterval(async () => {
    try {
        const { mongoClient, db } = await mongoConnect();
        const participants = await db.collection("participants").find({}).toArray();
        const lastStatusNow = Date.now();

        for (const participant of participants) {
            if (participant.lastStatus < lastStatusNow - 10000) {
                await db.collection("participants").deleteOne({ lastStatus: participant.lastStatus });
                await db.collection("messages").insertOne(
                    {
                        from: participant.name, 
                        to: 'Todos', 
                        text: 'sai da sala...', 
                        type: 'status', 
                        time: dayjs().format('HH:mm:ss')
                    }
                )
            }
        }
        mongoClient.close();
    } catch (error) {
        const { mongoClient } = await mongoConnect();
        res.sendStatus(500);
        mongoClient.close();
    }
}, 15000);

server.post('/participants', async (req, res) => {
    const { mongoClient, db } = await mongoConnect();
    const name = req.body.name;
    const participant = await db.collection("participants").findOne({ name: name });
    const message = {
        from: name, 
        to: 'Todos', 
        text: 'entra na sala...', 
        type: 'status', 
        time: dayjs().format('HH:mm:ss')
    };
    const validation = Joi.attempt(name, Joi.string().required());
    
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
        mongoClient.close();
    } catch  {
        res.sendStatus(500);
        mongoClient.close();
    }
    
});

server.get('/participants', async (req, res) => {
    const { mongoClient, db } = await mongoConnect();
    try {
        const participants = await db.collection("participants").find({}).toArray();
        res.send(participants);
        mongoClient.close();
    } catch {
        res.sendStatus(500);
        console.log('Erro!');
        mongoClient.close();
    }
});

server.post('/messages', async (req, res) => {
    const { mongoClient, db } = await mongoConnect();
    const user = req.headers.user;
    const textUser = req.body;
    const participant = await db.collection("participants").findOne({ name: user });
    const message = {...textUser, from: user, time: dayjs().format('HH:mm:ss')};

    const messageSchema = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().required().valid('message', 'private_message')
    })

    const validation = messageSchema.validate(textUser);
    if (validation.error || !participant) {
        res.status(422).send(validation.error);
        return
    }

    try {
        await db.collection("messages").insertOne(message)
        res.sendStatus(201);
        mongoClient.close();
    } catch {
        res.sendStatus(422);
        mongoClient.close();
    }
})

server.get('/messages', async (req, res) => {
    const { mongoClient, db } = await mongoConnect();
    const limit = parseInt(req.query.limit)

    if (!limit) {
            res.send(messages);
            mongoClient.close();
            return;
        }

    try {
        const messages = await db.collection("messages").find({}).toArray();
        res.send(messages.slice(-limit));
        mongoClient.close();

    } catch {
        res.sendStatus(500)
        mongoClient.close();
    }
})

server.post('/status', async (req, res) => {
    const { mongoClient, db } = await mongoConnect();
    const user = req.headers.user;
    const participant = await db.collection("participants").findOne({ name: user });
        
    if (!participant) {
        res.sendStatus(404);
        return;
    }

    try {
        await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() }});
        res.status(200).send(participant);
        mongoClient.close();
    } catch {
        res.sendStatus(500)
        mongoClient.close();
    }
})

server.delete('/messages/:id', async (req, res) => {
    const { mongoClient, db } = await mongoConnect();
    const user = req.headers.user;
    const { id } = req.params;
    const messageOwner = await db.collection("messages").findOne({ from: user })

    if (!messageOwner) {
        res.sendStatus(401);
        return;
    }

    try {
        await db.collection("messages").deleteOne({ _id: new ObjectId(id) });
        mongoClient.close();
    } catch {
        res.sendStatus(404);
        mongoClient.close();
    }
})

server.listen(5000);

//mongod --dbpath ~/.mongo