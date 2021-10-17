"use strict";

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
app.get("/calendarhook", (req, res) => {
    // Parse the request body from the POST
    let body = req.body;
    console.log(body);
    res.sendStatus(200);
});
// Accepts POST requests at /webhook endpoint
app.post("/calendarhook", async (req, res) => {
    // Parse the request body from the POST
    let body = req.body;
    console.log(body);
    let senderPsid = "4017100845057314";
    let savedItem = db.getItem(senderPsid, body.duration)?.[0];
    console.log(savedItem);
    const savedItemId = savedItem["id"];
    const savedItemUrl = savedItem["link"];
    const savedItemDuration = savedItem["duration"];
    const savedTitle = savedItem["title"];

    // const now = Date.now();
    // let d = Date.parse(body.start)
    // if(d <= now - 60*1000){ // if event date is in past
    //   console.log("late")
    //   return res.sendStatus(300);
    // }
    let desc = body.description.toLowerCase();
    let title = body.description.toLowerCase();
    let combo = desc + ' ' + title;
    if (
        combo.includes("departure") ||
        combo.includes("arrival") ||
        combo.includes("odjezd") ||
        combo.cincludes("příjezd") ||
        combo.cincludes("transport") ||
        combo.cincludes("flight") ||
        combo.cincludes("ticket")
    ) {
        if (savedItem) {
            let response = {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text: `Hey! I see you have about ${parseInt(
                            body.duration
                        )} free minutes. There's one of your saved pages: *${savedTitle}*. It should take about ${savedItemDuration} minutes to read/watch!`,
                        buttons: [
                            {
                                type: "web_url",
                                url: savedItemUrl,
                                title: savedItemUrl,
                                webview_height_ratio: "full"
                            }
                        ]
                    }
                }
            };
            await callSendAPI(senderPsid, response);
            await callSendAPI(
                senderPsid,
                await getActionsButton("How did it go?", savedItemId, savedItemDuration)
            );
        }
    }
    res.sendStatus(200);
});

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
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    // Parse params from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            // Respond with 200 OK and challenge token from the request
            // console.log("WEBHOOK_VERIFIED");

            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

const ACTION_SAVE = 1;
async function getSavedLink(senderPsid, time, usedItemIds = []) {
    let savedItem = db.getItem(senderPsid, time, usedItemIds)?.[0];
    if (!savedItem) {
        return { text: "Sorry, you don't have any unread links :/" };
    }

    const savedItemUrl = savedItem["link"];
    const savedItemTitle = savedItem["title"];
    const savedItemDuration = savedItem["duration"];

    let response = {
        attachment: {
            type: "template",
            payload: {
                template_type: "button",
                text: `Your content "${savedItemTitle}" for ${savedItemDuration} minutes:`,
                buttons: [
                    {
                        type: "web_url",
                        url: savedItemUrl,
                        title: savedItemUrl,
                        webview_height_ratio: "full"
                    }
                ]
            }
        }
    };
    await callSendAPI(senderPsid, response);
    const savedItemId = savedItem["id"];
    if (!usedItemIds.includes(savedItemId)) {
        usedItemIds.push(savedItemId);
    }
    return getActionsButton(
        "Choose your next action: ",
        savedItemId,
        time,
        usedItemIds
    );
}

// Handles messages events
async function handleMessage(senderPsid, receivedMessage) {
    let response;

    // Checks if the message contains text
    if (receivedMessage.text) {
        const url = getUrlFromMsg(receivedMessage.text);
        if (url) {
            const obj = await getDurationFromUrl(url);
            const duration = obj.duration;
            const title = obj.title;
            if (duration) {
                if (!db.saveItem(senderPsid, title, url, duration)) {
                    response = {
                        text: `😥😭😥 Your content is NOT saved, the view time would be ${duration} minutes 😥😭😥`
                    };
                } else {
                    response = {
                        text: `Your content is saved, the view time is ${duration} minutes`
                    };
                }
            } else {
                response = {
                    text: "Sorry, the url is not accessable or the content is too long."
                };
            }
        } else if (receivedMessage.text.startsWith(".help")) {
            response = {
                text: "Welcome to ViewLater, use .list to display items..."
            };
        } else if (receivedMessage.text.startsWith(".list")) {
            const results = db.getRecordsForUser(senderPsid);
            let text = "";
            results.forEach((item, index) => {
                text += index + 1 + ") " + item.title + " (" + item.duration + " min)";
                if (index != results.length - 1) text += "\n\n";
            });
            response = {
                text: text
            };
        } else if (receivedMessage.text.startsWith(".count")) {
            response = {
                text: "DB contains " + db.countRecords() + " records"
            };
        } else if (receivedMessage.text.startsWith(".id")) {
            response = {
                text: "👨‍🦼 Your id is " + senderPsid + " 👨‍🦼"
            };
        } else {
            const time = getTimeFromMsg(receivedMessage.text);
            if (time) {
                response = await getSavedLink(senderPsid, time, []);
            } else {
                // Create the payload for a basic text message, which
                // will be added to the body of your request to the Send API
                response = {
                    text: "Sorry, I didn't understand that :/"
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
                            title: "Nice picture!",
                            subtitle: ":)",
                            image_url: attachmentUrl,
                            buttons: [
                                {
                                    type: "postback",
                                    title: "Thanks!",
                                    payload: "thanks"
                                },
                                {
                                    type: "postback",
                                    title: "<3",
                                    payload: "love"
                                }
                            ]
                        }
                    ]
                }
            }
        };
    }

    // Send the response message
    await callSendAPI(senderPsid, response);
}

// Handles messaging_postbacks events
async function handlePostback(senderPsid, receivedPostback) {
    let response;

    // Get the payload for the postback
    let payload = JSON.parse(receivedPostback.payload);

    // Set the response based on the postback payload
    // if (payload === "yes") {
    //   response = { text: "Thanks!" };
    // } else if (payload === "no") {
    //   response = { text: "Oops, try sending another image." };
    // }
    // const arr = payload.split(" ");
    // const action = arr[0];
    // const id = arr[1];

    switch (payload.action) {
        case "read":
            response = { text: "Content deleted" };
            db.deleteRecord(payload.data.savedItemId);
            break;
        case "next":
            response = await getSavedLink(
                senderPsid,
                payload.data.time,
                payload.data.usedItemIds
            );
            break;
        default:
            response = { text: "Error" };
    }

    // Send the message to acknowledge the postback
    await callSendAPI(senderPsid, response);
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

function getActionsButton(title, savedItemId, time, usedItemIds = []) {
    return {
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: [
                    {
                        title,
                        buttons: [
                            {
                                type: "postback",
                                title: "I finished reading!",
                                payload: JSON.stringify({
                                    action: "read",
                                    data: {
                                        savedItemId
                                    }
                                })
                            },
                            {
                                type: "postback",
                                title: "Suggest different",
                                payload: JSON.stringify({
                                    action: "next",
                                    data: {
                                        savedItemId,
                                        time,
                                        usedItemIds
                                    }
                                })
                            }
                        ]
                    }
                ]
            }
        }
    };
}
