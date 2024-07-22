# RandBlem

## Overview

This project is an Electron-based application that integrates with the Destiny 2 API. It allows users to authenticate their profile and automatically, randomly update emblems in real-time. The app runs in a console environment with no additional setup after first launch.

This project was made by request from snackbar in the Discord Server [Macros, Scripts and Kisses](https://thrallway.com)

If you have any questions, join the server and ping or message me, `_kanye.`

To close the app or clear cookies, find the app in your tray and right click it to open a context menu.

To unlink your account, delete the "refresh-token": '' line in your preferences.json file, this also requires you to clear cookies if you want to link a new account

## Features

- Authentication with Destiny 2 API
- Unique Destiny 2 API app linking
- Fully automatic and random emblem updating


## Setup Guide

## [Video Tutorial](https://www.youtube.com/watch?v=eNxvcXVVbOA&feature=youtu.be)

### 1. Install Release or Clone Source
https://github.com/kanye4king/RandBlem/releases/tag/main

### 2. Create a New Destiny 2 API Application 

https://www.bungie.net/en/Application

### 3. Select the Following Settings
![image](https://github.com/user-attachments/assets/a1439cb8-605c-414e-9848-649941052d49)

### 4. Fill out preferences.json
Launch the app for the first time, and you will be prompted to fill out the required preferences
![image](https://github.com/user-attachments/assets/16c351a8-6d8b-44d1-9e86-80a0fb7520c8)

Navigate to `C:\Users\{your windows user here}\AppData\Roaming\randblem\preferences.json` and fill out the information from the Destiny 2 application you just created 
![image](https://github.com/user-attachments/assets/b263916e-de7f-4765-aa55-82752e72fe4e)

```json
{
  "api-key": "b1ee8b6da8a14c489ebc5d3ee1b5e232",
  "client-id": "47863",
  "client-secret": "6oD2jscVHK9Kdb7Awbl.6xCxdm-loH0PleBjFbfiZJ8"
}
```

### Relaunch the Application and Authenticate With Your Destiny 2 Login

![image](https://github.com/user-attachments/assets/85e881ba-affe-4d8b-8107-6450ae66f9f6)




