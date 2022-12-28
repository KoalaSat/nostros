package com.nostros.modules;

import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.nostros.classes.Relay;

import java.io.IOException;
import java.util.List;
import java.util.ListIterator;

public class RelayPoolModule extends ReactContextBaseJavaModule {
    protected List<Relay> relays;
    private String userPubKey;
    private DatabaseModule database;
    private ReactApplicationContext context;

    public RelayPoolModule(ReactApplicationContext reactContext) {
        database = new DatabaseModule(reactContext.getFilesDir().getAbsolutePath());
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
            Relay relay = new Relay(url, database, context);
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
                database.destroyRelay(relay);
            }
        }

        callback.invoke();
    }

    @ReactMethod
    public void connect(String pubKey, Callback callback) {
        userPubKey = pubKey;
        relays = database.getRelays(context);
        if (relays.isEmpty()) {
            add("wss://relay.damus.io");
            add("wss://nostr-relay.wlvs.space");
        }
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
