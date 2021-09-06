const config = require('config');

const sql = require('mssql');
const con = config.get('dbConfig_UCN');

const Joi = require('joi');

const _ = require('lodash');

class Book {
    // Blueprint for the book - how should a book look
    constructor(bookObj) {
        this.bookid = bookObj.bookid;
        this.title = bookObj.title;
        this.year = bookObj.year;
        this.link = bookObj.link;
        if (bookObj.authors) this.authors = _.cloneDeep(bookObj.authors);
    }

    static validate(bookWannabeeObj) {
        const schema = Joi.object({
            bookid: Joi.number()
                .integer()
                .min(1),
            title: Joi.string()
                .min(1)
                .max(255),
            year: Joi.number()
                .integer(),
            link: Joi.string()
                .uri()
                .max(255),
            authors: Joi.array()
                .items(
                    Joi.object({
                        authorid: Joi.number()
                            .integer()
                            .min(1),
                        firstname: Joi.string()
                            .max(50),
                        lastname: Joi.string()
                            .min(1)
                            .max(50)
                    })
                )
        });

        return schema.validate(bookWannabeeObj);
    }

    /* original version og readAll() w/o author information
        static readAll() {
            return new Promise((resolve, reject) => {
                (async () => {
                    // connect to the DB
                    // ask a question (query) from the DB
                    // check if the result is correct format
                    // all good --> resolve with formatted result
                    // if not --> reject with error
                    // !!!!!!!! close the DB connection!
    
                    try {
                        const pool = await sql.connect(con);
                        console.log('test 1');
                        const result = await pool.request().query(`
                            SELECT * 
                            FROM libexBook
                            `);
                        console.log(result);
    
                        const books = [];
                        result.recordset.forEach(record => {
                            const newBook = {
                                bookid: record.bookid,
                                title: record.title,
                                year: record.year,
                                link: record.link
                            }
    
                            const { error } = Book.validate(newBook);
                            if (error) throw { errorMessage: `Book.validate failed.` };
    
                            books.push(new Book(newBook));
                        });
    
                        resolve(books);
    
                    } catch (error) {
                        reject(error);
                    }
    
                    sql.close();
    
                })();
            });
        }
    */
    static readAll() {
        return new Promise((resolve, reject) => {
            (async () => {
                // connect to the DB
                // ask a question (query) from the DB <-- have to change the query! (JOIN JOIN oh JOIN)
                // check if the result is correct format <-- NEEDS EXTRA CARE
                // all good --> resolve with formatted result
                // if not --> reject with error
                // !!!!!!!! close the DB connection!

                try {
                    const pool = await sql.connect(con);
                    console.log('test 1');
                    const result = await pool.request().query(`
                        SELECT b.bookid, b.title, b.year, b.link, a.authorid, a.firstname, a.lastname 
                        FROM libexBook b
                        JOIN libexBookAuthor ba
                            ON b.bookid = ba.FK_bookid
                        JOIN libexAuthor a
                            ON ba.FK_authorid = a.authorid
                        ORDER BY b.bookid, a.authorid
                        `);
                    console.log(result);

                    // reject({error: 'stop'}); // for testing purposes, don't do this at home.

                    const books = [];   // this is NOT validated yet
                    let lastBookIndex = -1;
                    result.recordset.forEach(record => {
                        if (books[lastBookIndex] && record.bookid == books[lastBookIndex].bookid) {
                            // console.log(`Book with id ${record.bookid} already exists.`);
                            const newAuthor = {
                                authorid: record.authorid,
                                firstname: record.firstname,
                                lastname: record.lastname
                            }
                            books[lastBookIndex].authors.push(newAuthor);
                        } else {
                            // console.log(`Book with id ${record.bookid} is a new book.`)
                            const newBook = {
                                bookid: record.bookid,
                                title: record.title,
                                year: record.year,
                                link: record.link,
                                authors: [
                                    {
                                        authorid: record.authorid,
                                        firstname: record.firstname,
                                        lastname: record.lastname
                                    }
                                ]
                            }
                            books.push(newBook);
                            lastBookIndex++;
                        }
                    });

                    const validBooks = [];
                    books.forEach(book => {
                        const { error } = Book.validate(book);
                        // if (error) throw { errorMessage: `Book.validate failed.` };

                        validBooks.push(new Book(book));
                    });

                    resolve(validBooks);

                } catch (error) {
                    reject(error);
                }

                sql.close();

            })();
        });
    }

    create() {
        return new Promise((resolve, reject) => {
            (async () => {
                // need to connect to DB
                // query the DB (this case, INSERT with IDENTITY)
                // ...another(?) query to read out the new info
                // is there a result at all?
                // if yes, then check the format/reformat the result according to our needs (aka Book)
                // validate the object we created and see if it is indeed a 'Book'
                // if good, resolve with the book
                // if bad, reject with error
                // CLOSE THE DB connection!!!!!

                try {
                    const pool = await sql.connect(con);
                    const result00 = await pool.request()
                        .input('title', sql.NVarChar(50), this.title)
                        .input('year', sql.Int(), this.year)
                        .input('link', sql.NVarChar(255), this.link)
                        .input('authorid', sql.Int(), this.authors[0].authorid)
                        .query(`
                        INSERT INTO libexBook (title, year, link)
                        VALUES (@title, @year, @link);
                        
                        SELECT *
                        FROM libexBook
                        WHERE bookid = SCOPE_IDENTITY();

                        INSERT INTO libexBookAuthor (FK_bookid, FK_authorid)
                        VALUES (SCOPE_IDENTITY(), @authorid);
                    `)
                    // is there ANYTHING in result00?
                    // if NOT --> then the INSERT failed, need to throw an error
                    // if there IS a result00 --> read out the new book's bookid

                    if (!result00.recordset[0]) throw { dberror: 'Something went wrong with the INSERT to libexBook' }
                    const newBookId = result00.recordset[0].bookid;

                    const result = await pool.request()
                        .input('bookid', sql.Int(), newBookId)
                        .query(`
                            SELECT b.bookid, b.title, b.year, b.link, a.authorid, a.firstname, a.lastname
                            FROM libexBook b
                            JOIN libexBookAuthor ba
                                ON b.bookid = ba.FK_bookid
                            JOIN libexAuthor a
                                ON ba.FK_authorid = a.authorid
                            WHERE b.bookid = @bookid
                        `);

                    const books = [];
                    let lastBookIndex = -1;
                    result.recordset.forEach(record => {
                        if (books[lastBookIndex] && record.bookid == books[lastBookIndex].bookid) {
                            console.log(`Book with id ${record.bookid} already exists.`);
                            const newAuthor = {
                                authorid: record.authorid,
                                firstname: record.firstname,
                                lastname: record.lastname
                            }
                            books[lastBookIndex].authors.push(newAuthor);
                        } else {
                            console.log(`Book with id ${record.bookid} is a new book.`)
                            const newBook = {
                                bookid: record.bookid,
                                title: record.title,
                                year: record.year,
                                link: record.link,
                                authors: [
                                    {
                                        authorid: record.authorid,
                                        firstname: record.firstname,
                                        lastname: record.lastname
                                    }
                                ]
                            }
                            books.push(newBook);
                            lastBookIndex++;
                        }
                    });

                    const validBooks = [];
                    books.forEach(book => {
                        const { error } = Book.validate(book);
                        if (error) throw { errorMessage: `Book.validate failed.` };

                        validBooks.push(new Book(book));
                    });

                    resolve(validBooks);

                } catch (error) {
                    reject(error);
                }

                sql.close();
            })();
        });
    }

}

module.exports = Book;
