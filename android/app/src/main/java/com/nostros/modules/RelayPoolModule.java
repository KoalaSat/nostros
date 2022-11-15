package com.nostros.modules;

import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.nostros.classes.Relay;

import java.io.IOException;
import java.util.List;

public class RelayPoolModule extends ReactContextBaseJavaModule {
    protected List<Relay> relays;
    private String userPubKey;
    private DatabaseModule database;

    public RelayPoolModule(ReactApplicationContext reactContext) {
        database = new DatabaseModule(reactContext.getFilesDir().getAbsolutePath());

        List<Relay> relayList = database.getRelays();
        if (relayList.isEmpty()) {
            try {
                relayList.add(new Relay("wss://relay.damus.io", database));
            } catch (IOException e) {
                Log.d("WebSocket", e.toString());
            }
        }
        relays = relayList;
    }

    @Override
    public String getName() {
        return "RelayPoolModule";
    }

    @ReactMethod
    public void add(String url, Callback callback) {
        try {
            Relay relay = new Relay(url, database);
            relay.connect(userPubKey);
            relays.add(relay);
            database.saveRelay(relay);
        } catch (IOException e) {
            Log.d("WebSocket", e.toString());
        }
        callback.invoke();
    }

    @ReactMethod
    public void remove(String url, Callback callback) {
        for (Relay relay : relays) {
            if (relay.url.equals(url)) {
                relay.disconnect();
                relays.remove(relay);
                database.destroyRelay(relay);
            }
        }
        callback.invoke();
    }

    @ReactMethod
    public void connect(String pubKey, Callback callback) {
        userPubKey = pubKey;
        for (Relay relay : relays) {
            try {
                relay.connect(pubKey);
            } catch (IOException e) {
                Log.d("WebSocket", e.toString());
            }
        }
        callback.invoke();
    }

    @ReactMethod
    public void send(String message) {
        for (Relay relay : relays) {
            relay.send(message);
        }
    }
}
