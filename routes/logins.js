const express = require('express');
const router = express.Router();

const Login = require('../models/login');

// route handler
router.post('/', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    try {
        // console.log(error);
        // check the request body to see if it is in the correct format
        // JOI validation error
        const {error} = Login.validate(req.body);
        if(error) throw {statusCode: 400, errorMessage: error}
        console.log('hej');
        const loginObj = new Login(req.body);
        const user = await Login.readByEmail(loginObj);
        console.log(loginObj);
        return res.send(JSON.stringify(user));
        
        
    } catch(err) {
        console.log(err);
        // user input error
        if(!err.statusCode) return res.status(401).send(JSON.stringify({errorMessage: 'Incorrect user email or password.'}));
        if(!err.statusCode != 400) return res.status(401).send(JSON.stringify({errorMessage: 'Incorrect user email or password.'}));

        return res.status(400).send(JSON.stringify({errorMessage: err.errorMessage.details[0].message}));
    }
});

module.exports = router;