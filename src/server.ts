import express from "express";
import path from "path";
import fs from "fs";
import { SERVER_PORT, DATA_DIR } from "./config";
import { loadSites } from "./sites";
import { loadMeta } from "./storage";

const app = express();

// Basic JSON APIs
app.get("/api/sites", (_req, res) => {
  const sites = loadSites().map((s) => ({
    id: s.id,
    label: s.label,
    url: s.url,
  }));
  res.json(sites);
});

app.get("/api/sites/:id/shots", (req, res) => {
  const siteId = req.params.id;
  const meta = loadMeta(siteId);
  res.json(meta);
});

// Serve screenshot and diff images
app.get("/images/:siteId/:file", (req, res) => {
  const { siteId, file } = req.params;
  const imgPath = path.join(DATA_DIR, siteId, file);
  if (!fs.existsSync(imgPath)) {
    res.sendStatus(404);
    return;
  }
  res.sendFile(imgPath);
});

// Static frontend
app.use(
  express.static(path.join(process.cwd(), "public")),
);

// Fallback to index.html for root
app.get("/", (_req, res) => {
  res.sendFile(
    path.join(process.cwd(), "public", "index.html"),
  );
});

export function startServer(): void {
  app.listen(SERVER_PORT, () => {
    console.log(
      `Web UI listening on http://localhost:${SERVER_PORT}`,
    );
  });
}

// If run directly
if (require.main === module) {
  startServer();
}
