# OSX

Make sure you have Node 16.x

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

Open `nostros/android` to automatically start the first build process.
You'll probably need to `Sync with gradle files` (top-right corner)

## Install watchman

Check https://github.com/facebook/watchman/releases/download or use brew:

```
brew install node
brew install watchman
```

## Create Emulator (or connect Android phone and install adb)

Use the GUI of Android studio to create a new virtual devide, make sure you add enought internal storage (>= 2 GB).
Pixel 5 as template and System image R API level 30 Android 11.0 is the one we use on development.

## Run app

- Point a terminal to `nostros`
- Install yarn packages

```
yarn install
```

- Make sure your device is running, if you are using a physical one remember to run on a terminal `adb reverse tcp:8081 tcp:8081` so it can connect to Metro.
- Run Metro

```
yarn start
```

# Linux

Below instructions are for Ubuntu and other related Debian-based distributions. For other flavours, you'll probably just need to change the package manager.

Make sure you have Node 16.x

## Install JDK

Make sure you install version 17

```
https://www.oracle.com/java/technologies/downloads
```

## Install Android Studio

Download and install https://developer.android.com/studio/index.html
Use the local installation in preference to any flatpak release provided through your distro, this will save you issues with your environment later on!
Make sure you have the following libraries installed globally.

```
sudo npm install -g react-native-cli
sudo npm install -g yarn
sudo apt install android-sdk-platform-tools
```

Before opening the project in Android Studio, run `yarn install` in the project root folder. Otherwise gradle will complain of missing files in the `react-native` node-modules folder.

Open `nostros/android` to automatically start the first build process.
You'll probably need to `Sync with gradle files` (top-right corner)

## Install watchman

Check https://github.com/facebook/watchman/releases/download or use package manager:

```
sudo apt install watchman
```

## Create Emulator (or connect Android phone and install adb)

Use the GUI of Android studio to create a new virtual devide, make sure you add enought internal storage (>= 2 GB).
Pixel 5 as template and System image R API level 30 Android 11.0 is the one we use on development.

## Run app

- Point a terminal to `nostros`
- Install yarn packages

```
yarn install
```

- Make sure your device is running, if you are using a physical one remember to run on a terminal `adb reverse tcp:8081 tcp:8081` so it can connect to Metro.
- Run Metro

```
yarn start
```
