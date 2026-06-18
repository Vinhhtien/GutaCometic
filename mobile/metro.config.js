const http = require("http");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const backendHost = process.env.BACKEND_PROXY_HOST || "127.0.0.1";
const backendPort = Number(process.env.BACKEND_PROXY_PORT || 5000);

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => (req, res, next) => {
    if (!req.url?.startsWith("/api/")) {
      return metroMiddleware(req, res, next);
    }

    const proxyRequest = http.request(
      {
        hostname: backendHost,
        port: backendPort,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `${backendHost}:${backendPort}`,
        },
      },
      (proxyResponse) => {
        res.writeHead(proxyResponse.statusCode || 500, proxyResponse.headers);
        proxyResponse.pipe(res);
      }
    );

    proxyRequest.on("error", (error) => {
      if (res.headersSent) {
        res.end();
        return;
      }

      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: `Backend proxy unavailable: ${error.message}`,
        })
      );
    });

    req.pipe(proxyRequest);
  },
};

module.exports = config;
