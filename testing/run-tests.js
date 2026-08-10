const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// YYYY-MM-DD format based on local time
const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const logFileName = `${year}-${month}-${day}.log`;
const logFilePath = path.join(logsDir, logFileName);

// Create write stream (append mode)
const logStream = fs.createWriteStream(logFilePath, { flags: 'w' });

// Write start header
const timestamp = date.toISOString();
const startHeader = `\n=========================================\nTEST RUN START: ${timestamp}\n=========================================\n`;
logStream.write(startHeader);

// Spawn vitest run (using local bin path or npx to ensure compatibility)
const vitestPath = path.resolve(__dirname, 'node_modules/.bin/vitest');
const command = process.platform === 'win32' ? 'npx' : vitestPath;
const args = process.platform === 'win32' ? ['vitest', 'run'] : ['run'];

// Regex to strip ANSI escape codes
const stripAnsi = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

const child = spawn(command, args, {
  cwd: __dirname,
  shell: true,
  env: { ...process.env, FORCE_COLOR: '0' }
});

child.stdout.on('data', (data) => {
  const cleanData = stripAnsi(data.toString());
  logStream.write(cleanData);
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  const cleanData = stripAnsi(data.toString());
  logStream.write(cleanData);
  process.stderr.write(data);
});

child.on('close', (code) => {
  const endFooter = `\nTEST RUN END: ${new Date().toISOString()} (Exit Code: ${code})\n=========================================\n`;
  logStream.write(endFooter);
  logStream.end();
  process.exit(code);
});
