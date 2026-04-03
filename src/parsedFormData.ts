import { Request, Response, NextFunction } from "express";

export const parseFormDataJson = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.body?.data) {
    try {
      req.body = JSON.parse(req.body.data);
    } catch {
      res.status(400).json({ message: "Invalid JSON data" });
      return;
    }
  }

  next();
};
