import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
  });


mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
  // Optional: open dev tools
  mainWindow.webContents.openDevTools();
});