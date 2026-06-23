const { spawn, spawnSync } = require("child_process");
const path = require("path");

const maxAttempts = 4;
const retryDelaysMs = [3000, 6000, 12000];
const expoCli = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo",
  "bin",
  "cli"
);

const wait = (duration) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

const stopStaleNgrok = () => {
  if (process.platform !== "win32") {
    return;
  }

  spawnSync("taskkill", ["/IM", "ngrok.exe", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });
};

const startTunnel = (attempt) =>
  new Promise((resolve) => {
    console.log(`Starting Expo tunnel (attempt ${attempt}/${maxAttempts})...`);

    const child = spawn(
      process.execPath,
      [
        expoCli,
        "start",
        "--go",
        "--tunnel",
        "--port",
        "8081",
      ],
      {
        cwd: path.join(__dirname, ".."),
        env: process.env,
        stdio: "inherit",
        windowsHide: false,
      }
    );

    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });

    child.on("error", (error) => {
      console.error(`Unable to start Expo CLI: ${error.message}`);
      resolve({ code: 1 });
    });
  });

const main = async () => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    stopStaleNgrok();

    const result = await startTunnel(attempt);

    if (result.code === 0 || result.signal === "SIGINT") {
      process.exitCode = result.code;
      return;
    }

    if (attempt === maxAttempts) {
      console.error("Expo tunnel failed after multiple attempts.");
      process.exitCode = result.code;
      return;
    }

    const retryDelayMs = retryDelaysMs[attempt - 1];
    console.log(`Tunnel disconnected. Retrying in ${retryDelayMs / 1000}s...`);
    await wait(retryDelayMs);
  }
};

main();
