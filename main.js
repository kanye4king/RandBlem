const { startHttpsServer, closeHttpsServer } = require('./utils/httpsServer');
const Destiny2Api = require('./utils/d2api');
const Prefs = require('./utils/prefs');
const { app, dialog, shell, Tray, Menu, session } = require('electron');
const path = require('path');

const d2api = new Destiny2Api();
const prefs = new Prefs();
let tray = null;

async function main() {
    try {
        await app.whenReady();
        let canProceed = true;
        let clientId = await prefs.get('client-id');
        let apiKey = await prefs.get('api-key');
        let clientSecret = await prefs.get('client-secret');
        createTray();
        if (!clientId || clientId.trim() === '' || !apiKey || apiKey.trim() === '' || !clientSecret || clientSecret.trim() === '') canProceed = false;
        
        if (!canProceed) {
            shell.openPath(prefs.filePath);
            const result = await dialog.showMessageBox({
                type: 'info',
                title: 'Configuration Required',
                message: 'Please fill out the required preferences. Click the button below to open the GitHub README for more information:',
                buttons: ['Open GitHub README', 'Cancel']
            });
            if (result.response === 0) { 
                shell.openExternal('https://github.com/kanye4king/RandBlem/?tab=readme-ov-file#setup-guide');
            }
            app.quit();
        }
        d2api.apiKey = apiKey;
        d2api.clientId = clientId;
        d2api.clientSecret = clientSecret;
        d2api.headers.apiKey
        console.log("FROM MAIN: " + "Api Key: " + d2api.apiKey + "\n Client ID: " + d2api.clientId + "\n Client Secret:" + d2api.clientSecret);
        await checkAuth();
        handleEmblemUpdate();
        
    } catch (error) {
        console.error(`Error during application execution: ${error.message}\nStack trace: ${error.stack}`);
    }
}

app.on('window-all-closed', () => {
    // keeps the app alive when auth window is closed
});
app.on('before-quit', () => {
    closeHttpsServer();
});

function createTray() {
    const trayIconPath = path.join(__dirname, './randblem.ico');
    tray = new Tray(trayIconPath);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Clear Cookies',
            click: () => {
                session.defaultSession.clearStorageData({ storages: ['cookies'] })
            }
        },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setToolTip('RandBlem');
    tray.setContextMenu(contextMenu);
}

async function checkAuth() {
    try {
        const storedRefreshToken = await prefs.get('refresh-token');
        console.log(`Stored refresh token: ${storedRefreshToken ? 'Exists' : 'None'}`);

        if (!storedRefreshToken) {
            const client_id = await prefs.get("client-id");
            const code = await startHttpsServer(client_id);
            console.log(`Authorization code received: ${code}`);

            const tokenResponse = await d2api.getAccessToken(code);
            console.log(`Access token response: ${JSON.stringify(tokenResponse)}`);

            await prefs.set('refresh-token', tokenResponse.refreshToken);
            console.log('Refresh token saved successfully.');

            return false; 
        } else {
            d2api.refreshToken = storedRefreshToken;
            console.log('Refresh token loaded successfully.');
            return true; 
        }
    } catch (error) {
        console.error(`Error in checkAuth: ${error.message}\nStack trace: ${error.stack}`);
        return false; 
    }
}

async function handleEmblemUpdate() {
    try {
        await d2api.updateEmblem();

        const updateInterval = async () => {
            try {
                await d2api.updateEmblem();
            } catch (error) {
                console.error(`Error updating emblem: ${error.message}`);
            } finally {
                setTimeout(updateInterval, 5000);
            }
        };
        updateInterval();

    } catch (error) {
        console.error(`Error starting emblem update handling: ${error.message}`);
    }
}

main();
