import { PrismaClient } from "@prisma/client";
import express from "express";
const rateLimit = require("express-rate-limit");
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const urlSchema = z.object({
  url: z.string().url().max(2048),
});

const BASH_URL = process.env.BASH_URL;

const shortId = () => {
  return Buffer.from(Math.random().toString())
    .toString("base64")
    .replace(/[+/]/g, "")
    .substring(0, 8);
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

app.get("/",(req,res)=>{
  res.json({
    message: "Welcome to the URL Shortener API",
  })
})
app.post("/", async (req, res) => {
  try {
    const result = urlSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid URL provided" });
      return;
    }

    const hash = shortId();
    const { url } = result.data;

    const shortUrl = await prisma.url.create({
      data: {
        shortId: hash,
        url: url,
      },
    });

    res.status(201).json({
      shortId: hash,
      originalUrl: url,
      shortUrl: `${BASH_URL}/${hash}`,
    });
  } catch (error) {
    console.error("Error creating short URL:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;

    if (!shortId || shortId.length !== 8) {
      res.status(400).json({ error: "Invalid short ID" });
      return;
    }

    const url = await prisma.url.findUnique({
      where: { shortId },
      select: { url: true },
    });

    if (!url) {
      res.status(404).json({ error: "URL not found" });
      return;
    }

    res.set("Cache-Control", "public, max-age=300");
    return res.redirect(url.url);
  } catch (error) {
    console.error("Error retrieving URL:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
