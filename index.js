const env = require('dotenv').config();
const config = require('config');
const express = require('express');

const app = express();

const cors = require('cors');

app.use(express.json());
app.use(cors());

app.listen((config.get('port')), () => console.log(`Listening on port ${config.get('port')}...`));

