package com.nostros.modules;

import android.annotation.SuppressLint;
import android.database.Cursor;
import android.database.SQLException;
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
        database = SQLiteDatabase.openDatabase( absoluteFilesPath + "/nostros.sqlite", null, SQLiteDatabase.CREATE_IF_NECESSARY);
        database.execSQL("CREATE TABLE IF NOT EXISTS nostros_notes(\n" +
                "          id TEXT PRIMARY KEY NOT NULL, \n" +
                "          content TEXT NOT NULL,\n" +
                "          created_at INT NOT NULL,\n" +
                "          kind INT NOT NULL,\n" +
                "          pubkey TEXT NOT NULL,\n" +
                "          sig TEXT NOT NULL,\n" +
                "          tags TEXT NOT NULL,\n" +
                "          main_event_id TEXT,\n" +
                "          reply_event_id TEXT\n" +
                "        );");
        database.execSQL("CREATE TABLE IF NOT EXISTS nostros_users(\n" +
                "        id TEXT PRIMARY KEY NOT NULL,\n" +
                "        name TEXT,\n" +
                "        picture TEXT,\n" +
                "        about TEXT,\n" +
                "        main_relay TEXT,\n" +
                "        contact BOOLEAN DEFAULT FALSE,\n" +
                "        follower BOOLEAN DEFAULT FALSE\n" +
                "      );");
        database.execSQL("CREATE TABLE IF NOT EXISTS nostros_relays(\n" +
                "          url TEXT PRIMARY KEY NOT NULL,\n" +
                "          pet INTEGER\n" +
                "        );");
        database.execSQL("CREATE TABLE IF NOT EXISTS nostros_direct_messages(\n" +
                "          id TEXT PRIMARY KEY NOT NULL, \n" +
                "          content TEXT NOT NULL,\n" +
                "          created_at INT NOT NULL,\n" +
                "          kind INT NOT NULL,\n" +
                "          pubkey TEXT NOT NULL,\n" +
                "          sig TEXT NOT NULL,\n" +
                "          tags TEXT NOT NULL,\n" +
                "          conversation_id TEXT NOT NULL,\n" +
                "          read BOOLEAN DEFAULT FALSE\n" +
                "        );");
        try {
            database.execSQL("ALTER TABLE nostros_notes ADD COLUMN user_mentioned BOOLEAN DEFAULT FALSE;");
            database.execSQL("ALTER TABLE nostros_notes ADD COLUMN seen BOOLEAN DEFAULT FALSE;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN lnurl TEXT;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN created_at INT DEFAULT 0;");
        } catch (SQLException e) { }
        database.execSQL("CREATE TABLE IF NOT EXISTS nostros_reactions(\n" +
                "          id TEXT PRIMARY KEY NOT NULL, \n" +
                "          content TEXT NOT NULL,\n" +
                "          created_at INT NOT NULL,\n" +
                "          kind INT NOT NULL,\n" +
                "          pubkey TEXT NOT NULL,\n" +
                "          sig TEXT NOT NULL,\n" +
                "          tags TEXT NOT NULL,\n" +
                "          positive BOOLEAN DEFAULT TRUE,\n" +
                "          reacted_event_id TEXT,\n" +
                "          reacted_user_id TEXT\n" +
                "        );");
        try {
            database.execSQL("CREATE INDEX nostros_notes_pubkey_index ON nostros_notes(pubkey); ");
            database.execSQL("CREATE INDEX nostros_notes_main_event_id_index ON nostros_notes(main_event_id); ");
            database.execSQL("CREATE INDEX nostros_notes_reply_event_id_index ON nostros_notes(reply_event_id); ");
            database.execSQL("CREATE INDEX nostros_notes_kind_index ON nostros_notes(kind); ");

            database.execSQL("CREATE INDEX nostros_direct_messages_pubkey_index ON nostros_direct_messages(pubkey); ");
            database.execSQL("CREATE INDEX nostros_direct_messages_conversation_id_index ON nostros_direct_messages(conversation_id); ");

            database.execSQL("CREATE INDEX nostros_reactions_pubkey_index ON nostros_reactions(pubkey); ");
            database.execSQL("CREATE INDEX nostros_reactions_reacted_event_id_index ON nostros_reactions(reacted_event_id); ");

            database.execSQL("CREATE INDEX nostros_users_contact_index ON nostros_users(contact); ");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN nip05 TEXT;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN valid_nip05 BOOLEAN DEFAULT FALSE;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_notes ADD COLUMN repost_id TEXT;");
        } catch (SQLException e) { }
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
            cursor.moveToFirst();
            while (!cursor.isAfterLast()) {
                try {
                    String relayUrl = cursor.getString(0);
                    Relay relay = new Relay(relayUrl, this, reactContext);
                    relayList.add(relay);
                } catch (IOException e) {
                    Log.d("WebSocket", e.toString());
                }
                cursor.moveToNext();
            }
        }
        return relayList;
    }
}
