const express = require('express');
const app = express();
const { Client } = require('pg');
const db_url = process.env.DATABASE_URL;
const new_client = new Client({
  connectionString: db_url,
  ssl: {
    rejectUnauthorized: false
  }
});

// to manage user session
const dialogflowSessionClient = require('./botlib/dialogflow_session_client.js');
require('dotenv').config();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
process.env.GOOGLE_APPLICATION_CREDENTIALS;

const projectId = process.env.projectId;
const phoneNumber = process.env.phoneNumber;
const accountSid = process.env.accountSid;
const authToken = process.env.authToken;

const client = require('twilio')(accountSid, authToken);
const sessionClient = new dialogflowSessionClient(projectId);

port_num = 5000;
// start the server
// const listener = app.listen(process.env.PORT, function() {
    const listener = app.listen(port_num, function() {
    console.log('Your Twilio integration server is listening on port ' +
        listener.address().port);
});


app.post('/', async function(req, res) {
    // get the body of the msg
    const body = req.body;
    // get original text by the user
    const text = body.Body;
    // get user mobile number
    const sendTo = body.From;
    // detect the intent and pass the query
    const dialogflowResponse = (
        await sessionClient.detectIntent(text, sendTo, body)).fulfillmentText;

    console.log("User response => " + JSON.stringify(text, null, 2));
    let message; 
    try {
      message = await client.messages.create({
          body: dialogflowResponse,
          from: phoneNumber,
          to: sendTo
      });

      console.log("*** message sent successfully to => " + sendTo + "  *****"+ message.sid);
  } catch (error) {
      console.log("error => " + JSON.stringify(error, null, 2))
  }
  console.log("Dialogflow responce => " + JSON.stringify(dialogflowResponse, null, 2));
  
  // INSERT DATA INTO HEROKU DB
  new_client.connect()
      .then(() => {
        const now = new Date();
        const formattedDate = now.toISOString().replace('T', ' ').replace('Z', '+00:00');
        console.log('Connected to database');
        return new_client.query(`begin;set transaction read write;INSERT INTO public.customer_dialogue_tb(Dialogue_sid,User_identifier,Created_at,Channel,User_message,Bot_message) values 
               ('${message.sid}','${sendTo}','${formattedDate}','sms','${JSON.stringify(text, null, 2)}','${JSON.stringify(dialogflowResponse, null, 2)}');COMMIT;`);
      }).then((result) => { 
          console.log('Rows:', result.rows);
      })
      .catch((error) => {
          console.error('Error connecting to database', error);
      }).finally(() => {
          new_client.end();
      });

    // terminate the user request successfully
    res.end();

    //HEROKU WORK



});


process.on('SIGTERM', () => {
    listener.close(() => {
        console.log('Closing http server.');
        process.exit(0);
    });

});