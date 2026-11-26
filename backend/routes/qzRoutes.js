import express from "express";
import { authSecondary } from "../middlewares/authSecUsers.js";
import { signQzRequest, sendQzCertificate } from "../controllers/qzController.js";

const router = express.Router();

// Both endpoints require an authenticated ERP user. The private signing key
// remains exclusively on the server and is never sent to the browser.
router.get("/certificate", authSecondary, sendQzCertificate);
router.post("/sign", authSecondary, signQzRequest);

export default router;
