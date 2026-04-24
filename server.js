import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors({
  origin: "https://corncob567.github.io",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.options("*", cors());

app.use(express.json());
app.use(express.static(path.join(__dirname, "docs")));

const client = new Groq({ apiKey: process.env.GROQ_KEY });

// Load data once at startup
const CONFERENCE_DATA = fs.readFileSync(path.join(__dirname, "data/conference.txt"), "utf-8");
const attendees = JSON.parse(fs.readFileSync(path.join(__dirname, "data/attendees.json"), "utf-8"));
const ATTENDEE_LIST_STR = attendees
  .map(a => `- ${a.name} | Role: ${a.role ?? "N/A"} | Interests: ${a.interests} | Goal: ${a.goal}`)
  .join("\n");

// System prompts
const CHAT_SYSTEM = {
  role: "system",
  content:
    "You are a helpful conference assistant for RMUC.26, the Rent Manager User Conference in San Antonio. " +
    "Keep answers concise. Use this conference data ONLY to answer questions:\n" +
    CONFERENCE_DATA,
};

const MATCH_SYSTEM = {
  role: "system",
  content:
    "You are a professional networking assistant at RMUC.26, the Rent Manager User Conference. " +
    "Help attendees find meaningful connections. Be warm and encouraging. " +
    "Always respond in concise bullet points. " +
    "When ranking matches, include name, role, and a brief one-line reason. Only include, at most, the 3 matches." +
    "Remember the user's details and previous matches across the conversation. " +
    `Here are all the attendees:\n${ATTENDEE_LIST_STR}`,
};

// POST /api/chat  { messages: [...] }
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [CHAT_SYSTEM, ...messages],
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/match  { messages: [...] }
app.post("/api/match", async (req, res) => {
  try {
    const { messages } = req.body;
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [MATCH_SYSTEM, ...messages],
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RMUC Advisor running at http://localhost:${PORT}`));
