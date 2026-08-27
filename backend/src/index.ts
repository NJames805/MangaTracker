import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import searchRouter from './routes';
import libraryRouter from './library';

const app: Express = express();
const port = 3001;

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use(searchRouter);
app.use(libraryRouter);

app.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`);
});