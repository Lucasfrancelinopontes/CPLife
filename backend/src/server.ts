import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
const port = Number.parseInt(process.env.PORT ?? "8000", 10);
const host = process.env.HOST ?? "localhost";

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

app.use(cors());
app.use(express.json());

app.get("/api/status", (_request, response) => {
  response.json({
    ready: true,
    mode: "node",
  });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

const server = app.listen(port, host, () => {
  console.log(`CPLife backend listening on http://${host}:${port}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received. Shutting down backend.`);
  server.close((error) => {
    if (error) {
      console.error("Failed to close the backend server cleanly.", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
