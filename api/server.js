import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// GET /inventory
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

app.get("/", (req, res) => {
    res.json({ status: "ok", service: "Hardening API" });
});


app.post("/run-hardening", (req, res) => {
    const mode = req.body.mode || "audit";
    const whatIfFlag = mode === "audit" ? "-WhatIf:$true" : "-WhatIf:$false";

    const args = [
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", "C:\\Scripts\\Workstation-Hardening.ps1",
        "-WhatIf",
    ];

    execFile("powershell.exe", args, { windowsHide: true }, (error, stdout, stderr) => {
        console.log("HARDENING ARGS:", args.join(" "));
        console.log("HARDENING STDOUT:", stdout);
        console.log("HARDENING STDERR:", stderr);

        if (error) {
            console.error("Hardening error:", error);
            return res.status(500).json({ ok: false, error: stderr || error.message });
        }
        res.json({ ok: true });
    });
});

const port = 3001;
app.listen(port, () => {
    console.log(`Hardening API listening on http://localhost:${port}`);
});
