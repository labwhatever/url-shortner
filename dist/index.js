"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const rateLimit = require("express-rate-limit");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const urlSchema = zod_1.z.object({
    url: zod_1.z.string().url().max(2048),
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
app.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = urlSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: "Invalid URL provided" });
            return;
        }
        const hash = shortId();
        const { url } = result.data;
        const shortUrl = yield prisma.url.create({
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
    }
    catch (error) {
        console.error("Error creating short URL:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
app.get("/:shortId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { shortId } = req.params;
        if (!shortId || shortId.length !== 8) {
            res.status(400).json({ error: "Invalid short ID" });
            return;
        }
        const url = yield prisma.url.findUnique({
            where: { shortId },
            select: { url: true },
        });
        if (!url) {
            res.status(404).json({ error: "URL not found" });
            return;
        }
        res.set("Cache-Control", "public, max-age=300");
        return res.redirect(url.url);
    }
    catch (error) {
        console.error("Error retrieving URL:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
    process.exit(0);
}));
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
