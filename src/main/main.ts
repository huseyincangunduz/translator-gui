import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../renderer/preload.js')
    },
    title: 'Angular/TypeScript Translator'
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Development modunda DevTools aç
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// Klasör seçimi
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// Dosya seçimi (JSON çeviri dosyaları için - çoklu)
ipcMain.handle('select-files', async (_, filters?: { name: string; extensions: string[] }[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: filters || [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return [];
  }

  return result.filePaths;
});

// Dosya okuma
ipcMain.handle('read-file', async (_, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Dosya yazma
ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Klasör içindeki dosyaları tarama (recursive)
ipcMain.handle('scan-directory', async (_, dirPath: string, extensions: string[]) => {
  try {
    const files: string[] = [];
    
    function scanDir(currentPath: string) {
      try {
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
          try {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              // node_modules ve dist gibi klasörleri atla
              if (!['node_modules', 'dist', '.git', '.angular', 'release'].includes(item)) {
                scanDir(fullPath);
              }
            } else if (stat.isFile()) {
              const ext = path.extname(item);
              if (extensions.includes(ext)) {
                files.push(fullPath);
              }
            }
          } catch (error) {
            // İzin hatası veya erişilemeyen dosyaları es geç
            console.log(`Skipping ${path.join(currentPath, item)}: ${(error as Error).message}`);
          }
        }
      } catch (error) {
        // Klasör okuma hatası, es geç
        console.log(`Cannot read directory ${currentPath}: ${(error as Error).message}`);
      }
    }
    
    scanDir(dirPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
