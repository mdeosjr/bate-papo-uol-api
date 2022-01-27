import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const server = express();
server.use(cors());
server.use(json());

const connectBatePapo = new MongoClient(process.env.BATEPAPO_URI);

// server.post('/participants', async (req, res) => {
//     const name = req.body.name

//     try {
//         await connectBatePapo.connect();
//         const dbSala = connectBatePapo.db("salaBatePapo");
//         const participantsCollection = dbSala.collection("participants");
//         const participants = await participantsCollection.find({});
//         participants.insert({name, lastStatus: Date.now()});
//         res.sendStatus(201);
//         connectBatePapo.close();
//     } catch  {
//         res.sendStatus(500);
//         console.log('Erro!');
//         connectBatePapo.close();
//     }
// });

server.get('/participants', async (req, res) => {
    try {
        await connectBatePapo.connect();
        const dbSala = connectBatePapo.db("salaBatePapo");
        const participantsCollection = dbSala.collection("participants");
        const participants = await participantsCollection.find({}).toArray();
        res.send(participants);
        connectBatePapo.close();
    } catch {
        res.sendStatus(500);
        console.log('Erro!');
        connectBatePapo.close();
    }
});

server.listen(4000);