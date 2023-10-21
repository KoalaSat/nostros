package com.nostros.classes;

import android.content.ContentValues;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.nostros.modules.DatabaseModule;

import java.io.IOException;
import java.util.ArrayList;

public class Relay {
    private Websocket webSocket;
    public String url;
    public int active;
    public int globalFeed;
    public int paid;
    public int resilient;

    public Relay(String serverUrl, int isActive, int showGlobalFeed, int isResilient, Database database, ReactApplicationContext reactContext, ArrayList<String> events) throws IOException {
        url = serverUrl;
        active = isActive;
        globalFeed = showGlobalFeed;
        resilient = isResilient;
        webSocket = new Websocket(serverUrl, database, reactContext, events);
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

    public void setPaid(int paid) {
        this.paid = paid;
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

    public void save(Database database) {
        ContentValues values = new ContentValues();
        values.put("url", url);
        values.put("paid", paid);
        values.put("active", active);
        values.put("global_feed", globalFeed);
        values.put("resilient", resilient);
        values.put("deleted_at", 0);
        database.instance.replace("nostros_relays", null, values);
    }
}
