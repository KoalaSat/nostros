package com.nostros.classes;

import android.content.ContentValues;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.nostros.modules.DatabaseModule;

import java.io.IOException;

public class Relay {
    private Websocket webSocket;
    public String url;
    public int active;
    public int globalFeed;

    public Relay(String serverUrl, int isActive, int showGlobalFeed, DatabaseModule database, ReactApplicationContext reactContext) throws IOException {
        webSocket = new Websocket(serverUrl, database, reactContext);
        url = serverUrl;
        active = isActive;
        globalFeed = showGlobalFeed;
    }

    public int active() {
        return active;
    }

    public void setActive(int active) {
        this.active = active;
    }

    public void setGlobalFeed(int globalFeed) {
        this.globalFeed = globalFeed;
    }

    public void send(String message) {
        webSocket.send(message);
    }

    public void disconnect() {
        webSocket.disconnect();
    }

    public void connect(String userPubKey) throws IOException {
        webSocket.connect(userPubKey);
    }

    public void save(SQLiteDatabase database) {
        ContentValues values = new ContentValues();
        values.put("url", url);
        values.put("active", active);
        values.put("global_feed", globalFeed);
        values.put("deleted_at", 0);
        database.replace("nostros_relays", null, values);
    }
}
