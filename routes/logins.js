const express = require('express');
const router = express.Router();

const Login = require('../models/login');

// route handler
router.post('/', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    try {
        // check the request body to see if it is in the correct format
        // JOI validation error
        const {error} = Login.validate(req.body);
        if(error) throw {statusCode: 400, errorMessage: error}

        const loginObj = new Login(req.body);
        const user = await Login.readByEmail(loginObj);

        return res.send(JSON.stringify(user));


    } catch(err) {
        // user input error
        if(!err.statusCode || err.statusCode != 400) return res.statusCode(401).send(JSON.stringify({errorMessage: 'Incorrect user email or password.'}));

        return res.status(400).send(JSON.stringify({errorMessage: err.details[0].message}));
    }
});

module.exports = router;