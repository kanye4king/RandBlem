const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

class Prefs {
    constructor() {
        this.filePath = path.join(app.getPath('appData'), "randblem", "preferences.json");
        this._initializeFile();
    }

    async _initializeFile() {
        try {
            await fs.access(this.filePath);
            
            const fileContent = await fs.readFile(this.filePath, 'utf-8');
            const data = JSON.parse(fileContent);
    
            const requiredKeys = ['api-key', 'client-id', 'client-secret'];
            let needsUpdate = false;
    
            requiredKeys.forEach(key => {
                if (!data.hasOwnProperty(key)) {
                    console.warn(`Missing required key: ${key}`);
                    needsUpdate = true;
                }
            });
    
            if (needsUpdate) {
                await this._writeFile({
                    'api-key': data['api-key'] || '',
                    'client-id': data['client-id'] || '',
                    'client-secret': data['client-secret'] || ''
                });
                console.log('File updated with missing keys.');
            }
    
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(path.dirname(this.filePath), { recursive: true });
                await this._writeFile({
                    'api-key': '',
                    'client-id': '',
                    'client-secret': ''
                });
                console.log('File created with default values.');
            } else {
                throw error;
            }
        }
    }

    async _readFile() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this._initializeFile();
                return {};
            } else {
                throw error;
            }
        }
    }

    async _writeFile(data) {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(this.filePath, jsonData, 'utf8');
    }

    async get(key) {
        const data = await this._readFile();
        return data[key];
    }

    async set(key, value) {
        try {
            // Read existing data
            const data = await this._readFile();
            
            // Set the new key-value pair
            data[key] = value;
            
            // Write the updated data back to the file
            await this._writeFile(data);
            
            console.log(`Successfully set ${key} to ${value}`);
        } catch (error) {
            console.error(`Error setting ${key} to ${value}:`, error);
            throw new Error(`Unable to set ${key}: ${error.message}`);
        }
    }

    async getAll() {
        return await this._readFile();
    }
}

module.exports = Prefs;