const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT|| 5000;

// middlewear
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Doctors Portal')
})

app.listen(port, () => {
  console.log(`Doctors Portal Server condition is good ${port}`)
})