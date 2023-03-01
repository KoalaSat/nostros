package com.nostros.modules;

import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.nostros.classes.Database;
import com.nostros.classes.Relay;

import java.io.IOException;
import java.util.List;
import java.util.ListIterator;

public class RelayPoolModule extends ReactContextBaseJavaModule {
    protected List<Relay> relays;
    private String userPubKey;
    private Database database;
    private ReactApplicationContext context;

    public RelayPoolModule(ReactApplicationContext reactContext, Database databaseEntity) {
        database = databaseEntity;
        context = reactContext;
    }

    @Override
    public String getName() {
        return "RelayPoolModule";
    }

    @ReactMethod
    public void add(String url, Callback callback) {
        add(url);
        callback.invoke();
    }

    @ReactMethod
    public void add(String url) {
        try {
            Relay relay = new Relay(url, 1, 1, database, context);
            relay.connect(userPubKey);
            relays.add(relay);
            database.saveRelay(relay);
        } catch (IOException e) {
            Log.d("WebSocket", e.toString());
        }
    }

    @ReactMethod
    public void remove(String url, Callback callback) {
        ListIterator<Relay> iterator = relays.listIterator();
        while(iterator.hasNext()){
            Relay relay = iterator.next();
            if(url.equals(relay.url)){
                relay.disconnect();
                iterator.remove();
            }
        }
        database.deleteRelay(url);
        callback.invoke();
    }

    @ReactMethod
    public void update(String url, int active, int globalFeed, Callback callback) throws IOException {
        ListIterator<Relay> iterator = relays.listIterator();
        boolean relayExists = false;
        while(iterator.hasNext()){
            Relay relay = iterator.next();
            if(url.equals(relay.url)){
                int index = relays.indexOf(relay);
                relay.connect(userPubKey);
                relay.setActive(active);
                relay.setGlobalFeed(globalFeed);
                relay.save(database);
                this.relays.set(index, relay);
                relayExists = true;
            }
        }

        if (!relayExists) {
            this.add(url);
        }

        callback.invoke();
    }

    @ReactMethod
    public void connect(String pubKey, Callback callback) {
        userPubKey = pubKey;
        relays = database.getRelays(context);
        for (Relay relay : relays) {
            try {
                if (relay.active() > 0) {
                    relay.connect(pubKey);
                }
            } catch (IOException e) {
                Log.d("WebSocket", e.toString());
            }
        }
        callback.invoke();
    }

    @ReactMethod
    public void send(String message, boolean isGlobalFeed) {
        for (Relay relay : relays) {
            if (relay.active() > 0 && (!isGlobalFeed || relay.globalFeed > 0)) {
                relay.send(message);
            }
        }
    }

    @ReactMethod
    public void sendAll(String message, boolean isGlobalFeed) {
        for (Relay relay : relays) {
            if (relay.active() > 0 && (!isGlobalFeed || relay.globalFeed > 0)) {
                relay.send(message);
            }
        }
    }

    @ReactMethod
    public void sendRelay(String message, String relayUrl) {
        for (Relay relay : relays) {
            if (relay.active() > 0 && relayUrl.equals(relay.url)) {
                relay.send(message);
            }
        }
    }
}
