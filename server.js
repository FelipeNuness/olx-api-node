// Modules Import

require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fileupload = require('express-fileupload');

const apiRoutes = require('./src/routes');

mongoose.connect(process.env.DATABASE);
mongoose.Promise = global.Promise;
mongoose.connection.on('error', (error) => {
	console.log('Error: ', error);
});

const server = express();

// Middleware
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(fileupload());
server.use(express.static(path.join(__dirname, 'public')));

// Routes

server.use(apiRoutes);

server.listen(process.env.PORT);
