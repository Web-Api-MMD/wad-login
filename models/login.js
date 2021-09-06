const config = require('config');

const sql = require('mssql');
const con = config.get('dbConfig_UCN');

const Joi = require('joi');

const _ = require('lodash');

class Login {
    // the loginObj: {} userEmail and userPassword
    constructor(loginObj) {
        this.userEmail = loginObj.userEmail;
        this.userPassword = loginObj.userPassword;
    }

    // validate(loginObj)
    static validate(loginObj) {
    const schema = Joi.object({
        userEmail: Joi.string()
        .required(),
        // .email()
        userPassword: Joi.string()
        .min(1)
        .max(255)
        .required()
    });

    return schema.validate(loginObj);

    }

    // static readByEmail(loginObj)
    static readByEmail(loginObj) {
        return new Promise((resolve, reject) => {
            (async () => {
                // connect to DB
                // make a query from the DB using the pool object
                // have to check if something came back
                // if yes -> check format
                // if format is ok -> resolve
                // if no -> throw error and reject
                // AND CLOSE THE DB CONNECTION

                try {
                    const pool = await sql.connect(con);
                    const result = await pool.request()
                    .input('userEmail', sql.NVarChar(255), loginObj.userEmail)
                    .input('userPassword', sql.NVarChar(255), loginObj.userPassword)
                    .query(`
                        SELECT u.userId, u.userName, r.roleId, r.roleName
                        FROM loginUser u
                        JOIN loginPassword p
                            ON u.userId = p.FK_userId
                        JOIN loginRole r
                            ON r.roleId = u.FK_roleId
                        WHERE u.userEmail = @userEmail AND p.passwordValue = @userPassword
                    `);

                    console.log(result);

                    if(!result.recordset[0]) throw {statusCode: 404, errorMessage: 'User not found with provided credentials.'}
                    if(result.recordset.length > 1) throw {statusCode: 500, errorMessage: 'DB fucked yo. Multiple hits of unique data found'}

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
            })()
        })
    }
}

module.exports = Login;