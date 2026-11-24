// The Express app, without listen(). index.ts starts it; tests import it and
// start it on a random port.

import express from "express";
import { errorHandler, notFoundHandler } from "./errors";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { regionsRouter } from "./routes/regions";
import { websitesRouter } from "./routes/websites";

export const app = express();

app.disable("x-powered-by"); // don't advertise the framework
app.use(express.json({ limit: "100kb" }));

app.use(healthRouter);
app.use(authRouter);
app.use(websitesRouter);
app.use(regionsRouter);

// Order matters: 404 for unknown routes, then the error handler, last.
app.use(notFoundHandler);
app.use(errorHandler);
