import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import campaignHandler from "./api/campaign.js";
import stateHandler from "./api/state.js";

function createVercelLikeResponse(response) {
  return {
    setHeader: response.setHeader.bind(response),
    status(code) {
      response.statusCode = code;
      return {
        json(payload) {
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify(payload));
        },
      };
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "campaign-api-dev",
      configureServer(server) {
        server.middlewares.use("/api/campaign", (request, response) => {
          campaignHandler(request, createVercelLikeResponse(response));
        });
        server.middlewares.use("/api/state", async (request, response) => {
          let body = "";
          request.on("data", (chunk) => {
            body += chunk;
          });
          request.on("end", () => {
            try {
              request.body = body ? JSON.parse(body) : {};
            } catch {
              request.body = {};
            }
            stateHandler(request, createVercelLikeResponse(response));
          });
        });
      },
    },
  ],
});
