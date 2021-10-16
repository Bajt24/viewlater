"use strict";

// Imports dependencies and set up http server
import request from "request";
import express from "express";
import body_parser from "body-parser";
import {
    getDurationFromUrl,
    getUrlFromMsg,
    getTimeFromMsg,
    getContentType
} from "./randomFunctions.js";
import { Db } from "./db.js";

const app = express().use(body_parser.json()); // creates express http server

//const db = require("./db");
const db = new Db();
//db.createTable();

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Accepts POST requests at /webhook endpoint
app.post("/webhook", (req, res) => {
    // Parse the request body from the POST
    let body = req.body;

    // Check the webhook event is from a Page subscription
    if (body.object === "page") {
        // Iterate over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            // console.log(webhook_event);


            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log("Sender PSID: " + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Return a '200 OK' response to all events
        res.status(200).send("EVENT_RECEIVED");
    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});

// Accepts GET requests at the /webhook endpoint
app.get("/webhook", (req, res) => {
    console.log(req);
    /** UPDATE YOUR VERIFY TOKEN **/
    const VERIFY_TOKEN = "hp21token";

    // Parse params from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            // Respond with 200 OK and challenge token from the request
            console.log("WEBHOOK_VERIFIED");
            console.log(req);
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

const ACTION_SAVE = 1;
// Handles messages events
async function handleMessage(senderPsid, receivedMessage) {
    let response;

    // Checks if the message contains text
    if (receivedMessage.text) {
        const url = getUrlFromMsg(receivedMessage.text);
        if (url) {
            const duration = await getDurationFromUrl(url);
            if (duration != undefined) {
                db.saveItem(senderPsid, url, duration);
            }
            response = {
                text: `Your content is saved, the view time is ${duration} minutes`
            };
        } else {
            let time = getTimeFromMsg(receivedMessage.text);
            if (time != null) {
                let url = db.getItem(senderPsid, time)
                console.log("urllll", url)
                response = {
                    text: `Suggesting reading for ${time} minutes: ${url}"`
                };
            } else {
                // Create the payload for a basic text message, which
                // will be added to the body of your request to the Send API
                response = {
                    text: `Hello, Martin :) ${url}`
                };
            }
        }
    } else if (receivedMessage.attachments) {
        // Get the URL of the message attachment
        let attachmentUrl = receivedMessage.attachments[0].payload.url;
        response = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: "Is this the right picture?",
                            subtitle: "Tap a button to answer.",
                            image_url: attachmentUrl,
                            buttons: [
                                {
                                    type: "postback",
                                    title: "Yes!",
                                    payload: "yes"
                                },
                                {
                                    type: "postback",
                                    title: "No!",
                                    payload: "no"
                                }
                            ]
                        }
                    ]
                }
            }
        };
    }

    // Send the response message
    callSendAPI(senderPsid, response);
}

// Handles messaging_postbacks events
function handlePostback(senderPsid, receivedPostback) {
    let response;

    // Get the payload for the postback
    let payload = receivedPostback.payload;

    // Set the response based on the postback payload
    if (payload === "yes") {
        response = { text: "Thanks!" };
    } else if (payload === "no") {
        response = { text: "Oops, try sending another image." };
    }
    // Send the message to acknowledge the postback
    callSendAPI(senderPsid, response);
}

// Sends response messages via the Send API
function callSendAPI(senderPsid, response) {
    // The page access token we have generated in your app settings
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

    // Construct the message body
    let requestBody = {
        recipient: {
            id: senderPsid
        },
        message: response
    };

    // Send the HTTP request to the Messenger Platform
    request(
        {
            uri: "https://graph.facebook.com/v2.6/me/messages",
            qs: { access_token: PAGE_ACCESS_TOKEN },
            method: "POST",
            json: requestBody
        },
        (err, _res, _body) => {
            if (!err) {
                console.log("Message sent!");
            } else {
                console.error("Unable to send message:" + err);
            }
        }
    );
}
