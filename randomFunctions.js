// Imports dependencies and set up http server
import fetch from "node-fetch";
import jsdom from "jsdom";
//stepan
export function getUrlFromMsg(msg) {
  //citation: https://stackoverflow.com/a/6041965/3586860
  const match = msg.match(
    /(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/
  );
  if (match?.length) {
    return match[0];
  }
  return false;
}

//martin
// https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
export function isUrl(text) {
  return (
    !!text &&
    text.match(
      /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi
    )
  );
}
const CONTENT_VIDEO = "VIDEO"
const CONTENT_TEXT = "TEXT"
export function getContentType(url) {
  if (url.includes("youtube.com")) {
    return CONTENT_VIDEO;  
  } else {
    return CONTENT_TEXT;
  }
}

export async function getVideoLength(url) {
  if (url.includes("youtube.com")) {
    // TODO post request to https://yt5s.com/api/ajaxSearch
    // with User-Agent e.g. Mozzila

    const res = await fetch('https://yt5s.com/api/ajaxSearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozzila'
      },
      body: {
        q: url, vt: "home"
      }
    });
    
    console.log("aaaaa", res)

    // let response = ...
    // timeInSec = response['t']
  }
}
export async function getTextLengthFromUrl(url) {
  // creates express http server
  if (!url) {
    return false;
  }
  //https://www.npmjs.com/package/innertext
  try {
    const res = await fetch(url);
    const data = await res.text();
    const doc = new jsdom.JSDOM(data, "text/html");
    const mainElement = doc.window.document.querySelector("article");
    const mainText = mainElement.textContent;
    const countOfWords = mainText.split(" ").length;
    const humanReadSpeed = 300;
    console.log(`count: ${countOfWords}`);
    return Math.ceil(countOfWords / humanReadSpeed);
  } catch (e) {
    console.error(e);
  }
}
