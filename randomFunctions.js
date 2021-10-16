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
  return "";
}


export function getTimeFromMsg(msg) {
  const match = msg.match(/\d{2,}(:\d{2})?(:\d{2})?/);
  if (match?.length) {
    return match[0];
  }
  return null;
}

const CONTENT_VIDEO = "VIDEO";
const CONTENT_URL = "URL";
export function getContentType(url) {
  if (url.includes("youtube.com/watch") || url.includes("youtu.be") || url.includes("youtube.com/embed")) {
    return CONTENT_VIDEO;
  } else if (getUrlFromMsg(url) !== "") {
    return CONTENT_URL;
  } else {
    return ""
  }
}

export async function getVideoLength(url) {
  const res = await fetch("https://yt5s.com/api/ajaxSearch", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozzila"
    },
    body: new URLSearchParams({
      'q': url,
      'vt': "home",
    })
  });
  const data = await res.json();

  return Math.ceil(data?.t / 60)
  // return data?.t;
}

export async function getDurationFromUrl(url) {
  switch(getContentType(url)) {
    case CONTENT_VIDEO:
      return getVideoLength(url);
    case CONTENT_URL:
      return getTextLengthFromUrl(url);
    default:
      return ""
  }
}

async function getTextLengthFromUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const res = await fetch(url);
    const data = await res.text();
    const doc = new jsdom.JSDOM(data, "text/html");
    let mainElement = doc.window.document.querySelectorAll("article");
    if (!mainElement || !mainElement.length) {
      mainElement = doc.window.document.querySelectorAll(".content");
      if (!mainElement || !mainElement.length) {
        mainElement = doc.window.document.body;
      }
    }
    let mainText = "";
    if (mainElement.length) {
      mainElement.forEach(elem => {
        mainText += " " + elem.textContent;
      });
    } else {
      mainText = mainElement.textContent;
    }
    mainText = mainText.replace(/\s+/g, " ");
    const countOfWords = mainText.split(" ").length;
    const humanReadSpeed = 300;
    return Math.ceil(countOfWords / humanReadSpeed);
  } catch (e) {
    console.error(e);
  }
}
