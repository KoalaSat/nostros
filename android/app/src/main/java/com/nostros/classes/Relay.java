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

    public Relay(String serverUrl, DatabaseModule database, ReactApplicationContext reactContext) throws IOException {
        webSocket = new Websocket(serverUrl, database, reactContext);
        url = serverUrl;
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
