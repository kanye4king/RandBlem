const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const { app, BrowserWindow, session } = require('electron');
const forge = require('node-forge');


let oAuthWindow;
let server;
let appDataPath = path.join(app.getPath('appData'), "randblem");

function generateSelfSignedCerts(certPath, keyPath) { //this is an awful way of doing this in any real production app
    return new Promise((resolve, reject) => {
        const keys = forge.pki.rsa.generateKeyPair(2048);
        const cert = forge.pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

        const attrs = [{
            name: 'commonName',
            value: 'localhost'
        }, {
            name: 'countryName',
            value: 'US'
        }, {
            shortName: 'ST',
            value: 'CA'
        }, {
            name: 'localityName',
            value: 'San Francisco'
        }, {
            name: 'organizationName',
            value: 'RandBlem'
        }, {
            shortName: 'OU',
            value: 'RandBlem Certificate'
        }];

        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        cert.setExtensions([{
            name: 'basicConstraints',
            cA: true
        }, {
            name: 'keyUsage',
            keyCertSign: true,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true
        }, {
            name: 'extKeyUsage',
            serverAuth: true,
            clientAuth: true,
            codeSigning: true,
            emailProtection: true,
            timeStamping: true
        }, {
            name: 'nsCertType',
            client: true,
            server: true,
            email: true,
            objsign: true,
            sslCA: true,
            emailCA: true,
            objCA: true
        }]);
        cert.sign(keys.privateKey);
        fs.writeFileSync(certPath, forge.pki.certificateToPem(cert));
        fs.writeFileSync(keyPath, forge.pki.privateKeyToPem(keys.privateKey));

        resolve({ certPath, keyPath });
    });
}



async function startHttpsServer(client_id) {
    if (!appDataPath) {
        console.error('App data path is not available.');
        return null;
    }

    const certDir = path.join(appDataPath, 'certificates');
    console.log(certDir)
    ensureDirectoryExistence(certDir);

    const certPath = path.join(certDir, 'cert.pem');
    const keyPath = path.join(certDir, 'key.pem');

    try {
        await generateSelfSignedCerts(certPath, keyPath);

        const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };

        const expApp = express();

        server = https.createServer(options, expApp);
        const PORT = 8443;

        server.listen(PORT, () => {
            console.log(`HTTPS Server running on https://localhost:${PORT}`);
        });

        app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
        app.commandLine.appendSwitch('ignore-certificate-errors');
        // session.defaultSession.clearStorageData({ storages: ['cookies'] })

        oAuthWindow = new BrowserWindow({
            width: 600,
            height: 400,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webSecurity: false,
                allowRunningInsecureContent: true,
            }
        });

        oAuthWindow.loadURL(`https://www.bungie.net/en/OAuth/Authorize/?client_id=${client_id}&response_type=code`);

        oAuthWindow.on('closed', () => {
            oAuthWindow = null;
        });

        console.log('Starting HTTPS server...');

        return new Promise((resolve, reject) => {
            expApp.get('/callback', (req, res) => {
                oAuthWindow.close();
                const code = req.query.code;
                res.send('Authorization successful. You can close this window now.');
                closeHttpsServer();
                resolve(code);
                
            });
        });

    } catch (error) {
        console.error('Error generating self-signed certificates:', error);
        throw error; 
    }
}


function ensureDirectoryExistence(filePath) {
    console.log("path: " + filePath);
    try {
        fs.mkdirSync(filePath, { recursive: true });
        console.log(`Directory created successfully: ${filePath}`);
    } catch (error) {
        console.log(`Error creating directory: ${error.message}`);
    }
}

function closeHttpsServer() {
    if (server) {
        server.close(() => {
            console.log('HTTPS server closed.');
        });
    }
}

module.exports = { startHttpsServer, closeHttpsServer };