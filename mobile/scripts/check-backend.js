const http = require("http");

const request = http.get(
  {
    hostname: "127.0.0.1",
    port: 5000,
    path: "/api/health",
    timeout: 5000,
  },
  (response) => {
    response.resume();

    if (response.statusCode === 200) {
      console.log("Backend is ready on port 5000.");
      return;
    }

    console.error(`Backend health check failed: HTTP ${response.statusCode}`);
    process.exitCode = 1;
  }
);

request.on("timeout", () => {
  request.destroy(new Error("Backend health check timed out"));
});

request.on("error", (error) => {
  console.error(`Backend is unavailable on port 5000: ${error.message}`);
  console.error("Start it first: cd ../backend && npm run dev");
  process.exitCode = 1;
});
