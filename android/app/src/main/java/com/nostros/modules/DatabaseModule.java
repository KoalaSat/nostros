package com.nostros.modules;

import android.annotation.SuppressLint;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.nostros.classes.Event;
import com.nostros.classes.Relay;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class DatabaseModule {
    private SQLiteDatabase database;

    DatabaseModule(String absoluteFilesPath) {
        database = SQLiteDatabase.openDatabase( absoluteFilesPath + "/nostros.sqlite", null, SQLiteDatabase.OPEN_READWRITE);
    }

    public void saveEvent(JSONObject data, String userPubKey) throws JSONException {
        Event event = new Event(data);
        event.save(database, userPubKey);
    }

    public void saveRelay(Relay relay) {
        relay.save(database);
    }

    public void destroyRelay(Relay relay) {
        relay.destroy(database);
    }

    public List<Relay> getRelays(ReactApplicationContext reactContext) {
        List<Relay> relayList = new ArrayList<>();
        String query = "SELECT url FROM nostros_relays;";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {});
        if (cursor.getCount() > 0) {
            for (int i = 1; i < cursor.getCount(); i++) {
                try {
                    String relayUrl = cursor.getString(i);
                    Relay relay = new Relay(relayUrl, this, reactContext);
                    relayList.add(relay);
                } catch (IOException e) {
                    Log.d("WebSocket", e.toString());
                }
            }
        }
        return relayList;
    }
}
