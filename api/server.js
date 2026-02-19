import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// ---- routes below ----

// /inventory route using inventoryPath...
app.get("/inventory", (req, res) => {
    const inventoryPath = path.join(__dirname, "..", "scripts", "inventory.json");

    fs.readFile(inventoryPath, "utf8", (err, data) => {
        if (err) {
            if (err.code === "ENOENT") {
                return res.status(404).json({
                    status: "error",
                    message: "Inventory file not found",
                });
            }
            return res.status(500).json({
                status: "error",
                message: "Failed to read inventory file",
            });
        }

        try {
            const parsed = JSON.parse(data);
            return res.json({
                status: "ok",
                inventory: parsed,
            });
        } catch (e) {
            return res.status(500).json({
                status: "error",
                message: "Inventory file is not valid JSON",
            });
        }
    });
});

// your /hardening/run route stays unchanged...

const port = 3001;
app.listen(port, () => {
    console.log(`Hardening API listening on http://localhost:${port}`);
});
