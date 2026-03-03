const path = require("path");
const fs = require("fs");
const express = require("express");
const { execFile } = require("child_process");

const app = express();
app.use(express.json());

const DIST_DIR = path.join(process.cwd(), "dist");
app.use(express.static(DIST_DIR));

app.get("/", (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});


// Absolute path where inventory.json really lives:
const INVENTORY_PATH = "C:\\Users\\Jake.JGONZALEZ\\Downloads\\the-flapper-security-suite-main\\scripts\\inventory.json";

console.log("Using INVENTORY_PATH:", INVENTORY_PATH);
console.log("INVENTORY EXISTS:", fs.existsSync(INVENTORY_PATH));

app.get("/inventory", (req, res) => {
    console.log("GET /inventory hit, reading:", INVENTORY_PATH);

    fs.readFile(INVENTORY_PATH, "utf8", (err, data) => {
        if (err) {
            console.error("READ INVENTORY ERROR:", err.code, err.message);
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
            return res.json({ status: "ok", inventory: parsed });
        } catch {
            return res.status(500).json({
                status: "error",
                message: "Inventory file is not valid JSON",
            });
        }
    });
});

app.post("/run-hardening", (req, res) => {
    const mode = req.body.mode || "audit";

    // Absolute path for the script as well
    const scriptPath = "C:\\Users\\Jake.JGONZALEZ\\Downloads\\the-flapper-security-suite-main\\scripts\\Workstation-Hardening.ps1";

    const args = [
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File",
        scriptPath,
    ];
    if (mode === "audit") args.push("-WhatIf");

    execFile("powershell.exe", args, { windowsHide: true }, (error, stdout, stderr) => {
        console.log("HARDENING ARGS:", args.join(" "));
        console.log("STDOUT:", stdout);
        console.log("STDERR:", stderr);
        if (error) {
            return res.status(500).json({ ok: false, error: stderr || error.message });
        }
        res.json({ ok: true });
    });
});

const os = require("os");

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address; // e.g. 192.168.8.13
      }
    }
  }
  return "localhost";
}

const ip = getLocalIp();
const port = 3001;
app.listen(port, () => {
  console.log(`Hardening API listening on http://${ip}:${port}`);
  const start = process.platform === "win32" ? "start" : "xdg-open";
  require("child_process").exec(`${start} http://${ip}:${port}`);
});
