// Packages
const fs = require("nano-fs");
const path = require("path");
const { app, session, ipcMain } = require("electron");
const prepareNext = require("electron-next");
const { download } = require("./utils/download");

const buildMenu = require("./menu");

const { createMainWindow } = require("./windows/main");
const { createAboutWindow } = require("./windows/about");

let aboutWindow;
let mainWindow;
let willQuitApp = false;

const downloadSubtitles = async (event, args, mainWindow) => {
  const files = args.files;

  const downloadReference = files.map(async ({ file, subtitle }) => {
    const downloadLocation = path.dirname(file.path);
    const originalFileName = file.name;
    const subtitleFilename = originalFileName.replace(/\.[^/.]+$/, "");

    mainWindow.webContents.session.on(
      "will-download",
      (event, item, webContents) => {
        item.setSavePath(downloadLocation);

        item.once("done", (event, state) => {
          if (state === "completed") {
            console.log("Download successfully");
            return item;
          } else {
            console.log(`Download failed: ${state}`);
          }
        });
      }
    );

    mainWindow.webContents.downloadURL(subtitle.url);
  });

  try {
    console.log("promise? ", downloadReference);

    const items = await Promise.all(downloadReference);

    console.log("items: ", items);
  } catch (error) {
    console.log(error);
  }
};

const showAboutWindow = () => {
  aboutWindow.show();
  aboutWindow.focus();
};

const onCloseAboutWindow = event => {
  if (willQuitApp) {
    aboutWindow = null;
  } else {
    event.preventDefault();
    aboutWindow.hide();
  }
};

// Prepare the renderer once the app is ready
app.on("ready", async () => {
  await prepareNext("./renderer");

  mainWindow = createMainWindow();
  aboutWindow = createAboutWindow();

  const menu = buildMenu(aboutWindow, showAboutWindow);

  aboutWindow.on("close", event => onCloseAboutWindow(event));

  ipcMain.on("download-subtitle", (e, args) =>
    downloadSubtitles(e, args, mainWindow)
  );
});

// Quit the app once all windows are closed
app.on("before-quit", () => (willQuitApp = true));
app.on("window-all-closed", app.quit);
