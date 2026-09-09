import express from "express";
import path from "path";
import { todosRouter } from "./routes/todos";

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// API routes
app.use("/api/todos", todosRouter);

// Serve static frontend in production
const frontendDistPath = path.resolve(__dirname, "../../dist");
app.use(express.static(frontendDistPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
