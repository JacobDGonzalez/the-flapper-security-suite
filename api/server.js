import express from "express";
import { exec } from "child_process";
import fs from "fs";

const app = express();
app.use(express.json());

function runScript(whatIf, cb) {
    const flag = whatIf ? "-WhatIf" : "";
    const cmd =
        'powershell.exe -ExecutionPolicy Bypass -File "C:\\Scripts\\Workstation-Hardening.ps1" ' +
        flag;

    exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        cb(error, stdout, stderr);
    });
}

app.post("/hardening/run", (req, res) => {
    const { mode } = req.body || {};
    const whatIf = mode === "audit";

    runScript(whatIf, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({
                status: "error",
                message: error.message,
                stdout,
                stderr,
            });
        }

        res.json({
            status: "ok",
            mode: whatIf ? "audit" : "enforce",
            stdout,
            stderr,
        });
    });
});

// NEW: inventory endpoint
app.get("/inventory", (req, res) => {
    const path = "C:\\Scripts\\inventory.json"; // same path your PS script writes

    fs.readFile(path, "utf8", (err, data) => {
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
            res.json({
                status: "ok",
                inventory: parsed,
            });
        } catch (e) {
            res.status(500).json({
                status: "error",
                message: "Inventory file is not valid JSON",
            });
        }
    });
});

const port = 3001;
app.listen(port, () => {
    console.log(`Hardening API listening on http://localhost:${port}`);
});
