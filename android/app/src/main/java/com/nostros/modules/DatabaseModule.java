package com.nostros.modules;

import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.nostros.classes.Event;

import org.json.JSONException;
import org.json.JSONObject;

public class DatabaseModule extends ReactContextBaseJavaModule {
    private SQLiteDatabase database;

    DatabaseModule(ReactApplicationContext reactContext) {
        super(reactContext);
        String dbPath = reactContext.getFilesDir().getAbsolutePath();
        database = SQLiteDatabase.openDatabase( dbPath + "/nostros.sqlite", null, SQLiteDatabase.OPEN_READWRITE);
    }

    @Override
    public String getName() {
        return "DatabaseModule";
    }

    @ReactMethod
    public void saveEvent(JSONObject data) throws JSONException {
        Event event = new Event(data);
        event.save(database);
    }
}
