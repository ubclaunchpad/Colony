import express from "express";
import cors from "cors";

import orbitRouter from "./routers/orbitRouter.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/orbit", orbitRouter);

app.get("/ping", async (req, res) => {
    res.send("pong");
});

export default app;
