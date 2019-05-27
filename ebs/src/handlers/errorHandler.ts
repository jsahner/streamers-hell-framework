import { ErrorRequestHandler } from "express";
import log from "../log";

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  log.error(err);
  res.status(500).send("Unknown error");
};

export default errorHandler;
