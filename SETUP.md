# OSX

## Install JDK

Make sure you install version 17

```
https://www.oracle.com/java/technologies/downloads
```

## Install Android Studio

Download and install https://developer.android.com/studio/index.html
Make sure you have the following libraries installed globally.

```
npm install -g react-native-cli
brew install android-platform-tools
```

Open `nostros/android` to automatically start the first build process

## Install watchman

Check https://github.com/facebook/watchman/releases/download or use brew:

```
brew install node
brew install watchman
```

## Create Emulator (or connect Android phone and install adb)

Use the GUI of Android studio to create a new virtual devide, make sure you add enought internal storage (>= 2 GB).
As of 11/10/2022 we are using a Pixel 5 as template and System image R API level 30 Android 11.0

## Run app

- Point a terminal to `nostros`
- Install yarn packages

```
yarn install
```
- Make sure your virtual device is running
- Run Metro

```
yarn start
```
