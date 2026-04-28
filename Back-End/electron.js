const { app, BrowserWindow } = require("electron");

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
  });

  // Load your React app
  mainWindow.loadURL("http://localhost:5173"); // Vite default

  // Optional: open dev tools
  mainWindow.webContents.openDevTools();
});