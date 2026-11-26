import crypto from "crypto";

const decodePem = (value) => {
  if (!value) return "";

  // Base64 keeps multiline PEM values reliable in deployment environment settings.
  return Buffer.from(value, "base64").toString("utf8").replace(/\\n/g, "\n");
};

const getCertificate = () => decodePem(process.env.QZ_CERTIFICATE_BASE64);
const getPrivateKey = () => decodePem(process.env.QZ_PRIVATE_KEY_BASE64);

export const sendQzCertificate = (req, res) => {
  const certificate = getCertificate();

  if (!certificate) {
    return res.status(503).json({
      message: "QZ signing is not configured on the server.",
    });
  }

  res.type("text/plain").send(certificate);
};

export const signQzRequest = (req, res) => {
  const { toSign } = req.body;
  const privateKey = getPrivateKey();

  if (typeof toSign !== "string" || !toSign) {
    return res.status(400).json({ message: "A QZ message to sign is required." });
  }

  if (!privateKey) {
    return res.status(503).json({
      message: "QZ signing is not configured on the server.",
    });
  }

  try {
    const signature = crypto
      .createSign("RSA-SHA512")
      .update(toSign, "utf8")
      .end()
      .sign(privateKey, "base64");

    return res.json({ signature });
  } catch (error) {
    console.error("Unable to sign QZ request:", error);
    return res.status(500).json({ message: "Unable to sign the QZ request." });
  }
};
