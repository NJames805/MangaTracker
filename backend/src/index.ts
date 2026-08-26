import express, { type Express } from 'express';

const app: Express = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on http://localhost${port}`);
});