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
    public boolean active;

    public Relay(String serverUrl, boolean isActive,DatabaseModule database, ReactApplicationContext reactContext) throws IOException {
        webSocket = new Websocket(serverUrl, database, reactContext);
        url = serverUrl;
        active = isActive;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
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
        values.put("active", active ? 1 : 0);
        database.replace("nostros_relays", null, values);
    }

    public void destroy(SQLiteDatabase database) {
        String whereClause = "url = ?";
        String[] whereArgs = new String[] {
                url
        };
        database.delete ("nostros_relays", whereClause, whereArgs);
    }
}
