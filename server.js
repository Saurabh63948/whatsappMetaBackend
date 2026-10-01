const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173"
  })
);
app.use(express.json());
const messagesFile = path.join(__dirname, "messages.json");
if (!fs.existsSync(messagesFile)) {
  fs.writeFileSync(messagesFile, "[]");
}
app.get("/", (req, res) => {
  res.json({
    message: "WhatsApp backend is running"
  });
});

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
app.get("/webhook", (req, res) => {
  console.log("WEBHOOK GET RECEIVED");
  console.log("Query:", req.query);
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  console.log("Mode:", mode);
  console.log("Token:", token);
  console.log("Challenge:", challenge);
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return res.status(200).send(challenge);
  }
  console.log("Webhook verification failed");
  return res.sendStatus(403);
});
app.post("/webhook", (req, res) => {
  console.log("WEBHOOK POST RECEIVED");
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];
    if (!message) {
      return res.sendStatus(200);
    }
    const senderName = contact?.profile?.name || null;
    const senderPhone = message.from || null;
    const whatsappMessage = {
      name: senderName,
      phone: senderPhone,
      messageId: message.id || null,
      type: message.type || null,
      receivedAt: new Date().toISOString(),
      text: message.text
        ? {
            body: message.text.body || ""
          }
        : null,
      image: message.image
        ? {
            id: message.image.id || null,
            mimeType: message.image.mime_type || null,
            sha256: message.image.sha256 || null,
            caption: message.image.caption || null
          }
        : null,
      video: message.video
        ? {
            id: message.video.id || null,
            mimeType: message.video.mime_type || null,
            sha256: message.video.sha256 || null,
            caption: message.video.caption || null
          }
        : null,
      audio: message.audio
        ? {
            id: message.audio.id || null,
            mimeType: message.audio.mime_type || null,
            sha256: message.audio.sha256 || null,
            voice: message.audio.voice || false
          }
        : null,
      document: message.document
        ? {
            id: message.document.id || null,
            mimeType: message.document.mime_type || null,
            sha256: message.document.sha256 || null,
            filename: message.document.filename || null,
            caption: message.document.caption || null
          }
        : null,
      sticker: message.sticker
        ? {
            id: message.sticker.id || null,
            mimeType: message.sticker.mime_type || null,
            sha256: message.sticker.sha256 || null,
            animated: message.sticker.animated || false
          }
        : null,
      location: message.location
        ? {
            latitude: message.location.latitude || null,
            longitude: message.location.longitude || null,
            name: message.location.name || null,
            address: message.location.address || null,
            url: message.location.url || null
          }
        : null,
      contacts: message.contacts
        ? message.contacts
        : null,
      reaction: message.reaction
        ? {
            messageId: message.reaction.message_id || null,
            emoji: message.reaction.emoji || null
          }
        : null,
      interactive: message.interactive
        ? message.interactive
        : null,
      button: message.button
        ? message.button
        : null,
      raw: message
    };
    if (message.type === "text") {
      whatsappMessage.message = message.text?.body || null;
    } else if (message.type === "image") {
      whatsappMessage.message = message.image?.caption || "Image";
    } else if (message.type === "video") {
      whatsappMessage.message = message.video?.caption || "Video";
    } else if (message.type === "audio") {
      whatsappMessage.message = "Audio";
    } else if (message.type === "document") {
      whatsappMessage.message =
        message.document?.filename || "Document";
    } else if (message.type === "sticker") {
      whatsappMessage.message = "Sticker";
    } else if (message.type === "location") {
      whatsappMessage.message = "Location";
    } else if (message.type === "contacts") {
      whatsappMessage.message = "Contact shared";
    } else if (message.type === "reaction") {
      whatsappMessage.message =
        message.reaction?.emoji || "Reaction";
    } else if (message.type === "interactive") {
      whatsappMessage.message = "Interactive message";
    } else if (message.type === "button") {
      whatsappMessage.message = "Button response";
    } else {
      whatsappMessage.message = null;
    }

    console.log("Clean WhatsApp Message:");
    console.log(JSON.stringify(whatsappMessage, null, 2));
    let messages = [];
    try {
      const fileData = fs.readFileSync(
        messagesFile,
        "utf-8"
      ).trim();

      if (fileData) {
        messages = JSON.parse(fileData);
      }
    } catch (error) {
      console.error(
        "Failed to read messages.json:",
        error
      );

      messages = [];
    }
    /*
      Save new message
    */
    messages.push(whatsappMessage);
    fs.writeFileSync(
      messagesFile,
      JSON.stringify(messages, null, 2)
    );
    console.log("Message saved to messages.json");
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(500);
  }
});
app.get("/messages", (req, res) => {
  try {
    const fileData = fs
      .readFileSync(messagesFile, "utf-8")
      .trim();
    const messages = fileData
      ? JSON.parse(fileData)
      : [];
    res.status(200).json(messages);
  } catch (error) {
    console.error(
      "Get messages error:",
      error
    );
    res.status(500).json({
      message: "Failed to get messages"
    });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `WhatsApp server running on port ${PORT}`
  );
});