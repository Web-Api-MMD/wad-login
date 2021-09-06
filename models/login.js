const config = require('config');

const sql = require('mssql');

const con = config.get('dbConfig_UCN');
const salt = parseInt(config.get('saltRounds'));

const Joi = require('joi');
const bcrypt = require('bcryptjs');

const _ = require('lodash');


class Login {
    // the loginObj: {} userEmail and userPassword
    constructor(loginObj) {
        this.userEmail = loginObj.userEmail;
        this.userPassword = loginObj.userPassword;
        this.userName = loginObj.userName;
    }

    // validate(loginObj)
    static validate(loginObj) {
    const schema = Joi.object({
        userEmail: Joi.string()
        .email()
        .required(),
        userPassword: Joi.string()
        .min(1)
        .max(255)
        .required(),
        userName: Joi.string()
        .min(1)
        .max(50)
    });

    return schema.validate(loginObj);

    }

    // static readByEmail(loginObj)
    static readByEmail(loginObj) {
        return new Promise((resolve, reject) => {
            (async () => {
                // BUT FIRST!!! CHECK IF USER ALREADY EXISTS IN THE DB

                // connect to DB
                // make a query from the DB using the pool object
                // have to check if something came back
                // IMPORTANT = CHECK THE HASHED PASSWORD WITH BCRYPT
                // if yes -> check format
                // if format is ok -> resolve
                // if no -> throw error and reject
                // AND CLOSE THE DB CONNECTION

                // -- CHECK IF USER EXISTS -- Code goes here

                try {
                    const pool = await sql.connect(con);
                    const result = await pool.request()
                    .input('userEmail', sql.NVarChar(255), loginObj.userEmail)
                    .query(`
                        SELECT u.userId, u.userName, r.roleId, r.roleName, p.passwordValue
                        FROM loginUser u
                        JOIN loginPassword p
                            ON u.userId = p.FK_userId
                        JOIN loginRole r
                            ON r.roleId = u.FK_roleId
                        WHERE u.userEmail = @userEmail
                    `);

                    console.log(result);

                    if(!result.recordset[0]) throw {statusCode: 404, errorMessage: 'User not found with provided credentials.'};
                    if(result.recordset.length > 1) throw {statusCode: 500, errorMessage: 'DB fucked yo. Multiple hits of unique data found'};

                    // Check hashedPassword with bcrypt - compare
                    const bcrypt_result = await bcrypt.compare(loginObj.userPassword, result.recordset[0].passwordValue);

                    if(!bcrypt_result) throw {statusCode: 404, errorMessage: 'User not found with provided credentials.'};

                    const user = {
                        userId: result.recordset[0].userId,
                        userId: result.recordset[0].userId,
                        userRole: {
                            roleId: result.recordset[0].roleId,
                            roleName: result.recordset[0].roleName
                        }
                    }

                    resolve(user);
                    // check if the format is correct
                    // will need a proper validate function for that 

                } catch (error) {
                    console.log(error);
                    reject(error);
                }

                sql.close(); // ABC - ALWAY BE CLOSING
            })();
        })
    };



    // create method to send the data to the database
    create() {
        return new Promise((resolve, reject) => {
            (async () => {
                // Connect to the DB
                // Make a query (INSERT INTO loginUser, SELECT with SCOPE_IDENTITY(), INSERT INTO loginPassword)
                // If all good -> one result back with the userId in the result
                // Check format (again we don't have a validator for that ATM)
                // resolve with user
                // if anything wrong, throw error and reject with error
                // CLOSE DB CONNECTION
                try {
                    // let's generate hashedPassword with bcryptjs
                    const hashedPassword = await bcrypt.hash(this.userPassword, salt);

                    const pool = await sql.connect(con);
                    const result00 = await pool.request()
                    .input('userName', sql.NVarChar(50), this.userName)
                    .input('userEmail', sql.NVarChar(255), this.userEmail)
                    .input('hashedPassword', sql.NVarChar(255), hashedPassword)
                    .query(`
                    INSERT INTO loginUser([userName], [userEmail], [FK_roleId])
                    VALUES (@userName, @userEmail, 2)
                    
                    SELECT u.userId, u.userName, r.roleId, r.roleName
                    FROM loginUser u
                    JOIN loginRole r
                        ON u.FK_roleId = r.roleId
                    WHERE u.userId = SCOPE_IDENTITY();

                    INSERT INTO loginPassword([passwordValue], [FK_userId])
                    VALUES (@hashedPassword, SCOPE_IDENTITY())
                    `);

                    console.log(result00);
                    if(!result00.recordset[0]) throw {statusCode: 500, errorMessage: 'Something went wrong. Login is not created.'} 

                    const user = {
                        userId: result00.recordset[0].userId,
                        userId: result00.recordset[0].userId,
                        userRole: {
                            roleId: result00.recordset[0].roleId,
                            roleName: result00.recordset[0].roleName
                        }
                    }
                    console.log('hej');
                    resolve(user);

                } catch (error) {
                    console.log(error);
                    reject(error);
                }
                sql.close(); // ABC - ALWAYS BE CLOSING
            })();
        });
    }
}

module.exports = Login;