import qz from "qz-tray";
import api from "@/api/api";

let configured = false;

/**
 * Configures trusted QZ printing when VITE_QZ_SIGNING_ENABLED is true.
 * The certificate is public; the matching private key stays in the backend.
 */
export const configureQzSecurity = () => {
  if (configured || import.meta.env.VITE_QZ_SIGNING_ENABLED !== "true") {
    return;
  }

  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setCertificatePromise(() =>
    api
      .get("/api/qz/certificate", {
        responseType: "text",
        withCredentials: true,
      })
      .then((response) => response.data),
  );

  qz.security.setSignaturePromise((toSign) =>
    api
      .post(
        "/api/qz/sign",
        { toSign },
        { withCredentials: true },
      )
      .then((response) => response.data.signature),
  );

  configured = true;
};
