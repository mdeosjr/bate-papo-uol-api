import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const server = express();
server.use(cors());
server.use(json());

const MongoClient = new MongoClient(process.env.BATEPAPO_URI);

server.listen(4000);