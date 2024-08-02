const axios = require('axios');
const { URLSearchParams } = require('url');
const { stringify } = require('flatted'); 

const emblemBucketHash = 4274335291;
const orbitHash = 82913930;
let lastOrbitTime = new Date(0);

class Destiny2Api {
    constructor() {
        this.apiKey = null;
        this.clientId = null;
        this.clientSecret = null;
        this.accessToken = null;
        this.refreshToken = null; 
        this.baseUrl = 'https://www.bungie.net';
        this.headers = {
            'X-API-Key': this.apiKey,
            Authorization: `Bearer ${this.accessToken}`
        };
        this.profile = {};
        this.stats = null;
        this.mostRecentCharacter = null;
    }

    getCurrentUser = async () => {
        if (!this.accessToken) {
            try {
                await this.refreshAccessToken();
            } catch (error) {
                console.error('Error refreshing access token:', error.stack);
                throw error;
            }
        }
        let response;
        try {
            response = await axios.get(`${this.baseUrl}/Platform/User/GetMembershipsForCurrentUser/`, {
                headers: this.headers
            });
            let membershipType;
            if(response.data.Response.destinyMemberships[0].crossSaveOverride){ // annoying cross save stuff
                membershipType = response.data.Response.destinyMemberships[0].crossSaveOverride
                console.log("crossSaveOverride")
            }
            else{
                membershipType = response.data.Response.destinyMemberships[0].applicableMembershipTypes[0];
            }
            
            const membershipId = response.data.Response.destinyMemberships[0].membershipId;
            this.currentUser = { membershipType: membershipType, membershipId: membershipId, characters: null };
            this.profile.user = response.data;
            await this.getProfile();
        } catch (error) {
            const statusCode = error.response.status;
            if(statusCode == 401) {  // acccess token expired
                await this.refreshAccessToken();
                await this.updateEmblem(); //retry the request
            }
            console.error(`Error fetching profile: ${error.message}\n${error.stack}`);
            throw new Error(`Error fetching profile: ${error.message}`);
        }
    }

    getProfile = async () => {
        const url = `${this.baseUrl}/Platform/Destiny2/${this.currentUser.membershipType}/Profile/${this.currentUser.membershipId}/?components=200,201,204`;
        try {
            const response = await axios.get(url, {
                headers: this.headers
            });
            this.currentUser.characters = response.data.Response.characters.data;
            this.profile.characters = response.data;
            return response.data.Response;
        } catch (error) {
            const errorMessage = `Error fetching profile from ${url}: ${error.message}\n${error.stack}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    equipEmblem = async (characterId, itemInstanceId) => {
        try {
            const body = {
                itemId: itemInstanceId,
                characterId: characterId,
                membershipType: this.currentUser.membershipType
            };
            const response = await axios.post(`${this.baseUrl}/Platform/Destiny2/Actions/Items/EquipItem/`, body, {
                headers: this.headers
            });
            return response.data.Response;
        } catch (error) {
            const errorMessage = `Error equipping emblem: ${error.message}\n${error.stack}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    updateEmblem = async () => {
        //console.log("From update emblem: " + this.accessToken + "\n Api Key: " + this.apiKey + "\n Client Id:" + this.clientId + "\n Client Secret: " + this.clientSecret + `\n Headers: ${JSON.stringify(this.headers)}`);
        try {
            await this.getCurrentUser();
            const mostRecentCharacter = this.findMostRecentCharacter();
            const isInOrbit = this.profile.characters.Response.characterActivities.data[mostRecentCharacter.characterId].currentActivityHash === orbitHash;
            if (isInOrbit) {
                const dateActivityStarted = new Date(this.profile.characters.Response.characterActivities.data[mostRecentCharacter.characterId].dateActivityStarted);
                if(dateActivityStarted > lastOrbitTime){
                    console.log("Orbit Detected")
                    lastOrbitTime = dateActivityStarted;
                }
                else{
                    return;
                }
            } else {
                return;
            }
            if (!mostRecentCharacter) {
                throw new Error('No characters found.');
            }

            const emblems = await this.getInventoryEmblems(mostRecentCharacter);

            if (!emblems || emblems.length === 0) {
                throw new Error('No emblems found.');
            }

            const randomIndex = Math.floor(Math.random() * emblems.length);
            const randomItem = emblems[randomIndex];

            await this.equipEmblem(mostRecentCharacter.characterId, randomItem.itemInstanceId);
            console.log('Emblem Equipped.');

        } catch (error) {
            console.error('Error updating emblem:', error.stack);
        }
    }

    findMostRecentCharacter = () => {
        let mostRecentCharacter = null;
        let mostRecentDate = new Date(0);
        const characters = this.currentUser.characters;

        if (!characters) {
            console.error('No characters data available.');
            return null;
        }

        Object.values(characters).forEach(character => {
            const lastPlayedDate = new Date(character.dateLastPlayed);

            if (lastPlayedDate > mostRecentDate) {
                mostRecentDate = lastPlayedDate;
                mostRecentCharacter = character;
            }
        });

        this.mostRecentCharacter = mostRecentCharacter;
        return mostRecentCharacter;
    }

    getInventoryEmblems = async (character) => {
        try {
            const profile = await this.getProfile();
            const characterInventory = profile.characterInventories.data[character.characterId].items;
            const emblemItems = characterInventory.filter(item => item.bucketHash === emblemBucketHash);

            return emblemItems;
        } catch (error) {
            const errorMessage = `Error fetching emblem items: ${error.message}\n${error.stack}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    getAccessToken = async (code) => {
        try {
            const authUrl = 'https://www.bungie.net/platform/app/oauth/token/';
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: this.clientId
            });

            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
                }
            };

            const response = await axios.post(authUrl, params, config);

            if (response.status === 200 && response.data.access_token && response.data.refresh_token) {
                this.accessToken = response.data.access_token;
                this.headers.Authorization = `Bearer ${this.accessToken}`;
                this.refreshToken = response.data.refresh_token;
                return {
                    accessToken: this.accessToken,
                    refreshToken: this.refreshToken
                };
            } else {
                throw new Error('Invalid response from the authentication server');
            }
        } catch (error) {
            if (error.response) {
                console.error(`Error response from server: ${error.response.status} - ${JSON.stringify(error.response.data)}\n${error.stack}`);
                throw new Error(`Error response from server: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                console.error(`No response received: ${JSON.stringify(error.request)}\n${error.stack}`);
                throw new Error('No response received from the authentication server');
            } else {
                console.error(`Error in request setup: ${error.message}\n${error.stack}`);
                throw new Error(`Error in request setup: ${error.message}`);
            }
        }
    }

    refreshAccessToken = async () => {
        try {
            this.headers = {
                'X-API-Key': this.apiKey,
                Authorization: `Bearer ${this.accessToken}`
            };
            const authUrl = 'https://www.bungie.net/platform/app/oauth/token/';
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken,
                client_id: this.clientId
            });

            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
                }
            };

            const response = await axios.post(authUrl, params, config);
            this.accessToken = response.data.access_token;
            this.refreshToken = response.data.refresh_token;
            this.headers.Authorization = `Bearer ${this.accessToken}`;
            console.log('Access token refreshed');
        } catch (error) {
            if (error.response) {
                console.error(`Error response from server: ${error.response.status} - ${JSON.stringify(error.response.data)}\n${error.stack}`);
            } else if (error.request) {
                console.error(`No response received: ${JSON.stringify(error.request)}\n${error.stack}`);
            } else {
                console.error(`Error in request setup: ${error.message}\n${error.stack}`);
            }
            throw new Error(`Error refreshing access token: ${error.message}`);
        }
    }

}

module.exports = Destiny2Api;
