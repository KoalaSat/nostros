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
    public SQLiteDatabase database;

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
                "        contact BOOLEAN DEFAULT 0,\n" +
                "        follower BOOLEAN DEFAULT 0\n" +
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
                "          read BOOLEAN DEFAULT 0\n" +
                "        );");
        try {
            database.execSQL("ALTER TABLE nostros_notes ADD COLUMN user_mentioned BOOLEAN DEFAULT 0;");
            database.execSQL("ALTER TABLE nostros_notes ADD COLUMN seen BOOLEAN DEFAULT 0;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN lnurl TEXT;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN created_at INT DEFAULT 0;");
        } catch (SQLException e) { }
        try {
        database.execSQL("CREATE TABLE IF NOT EXISTS nostros_reactions(\n" +
                "          id TEXT PRIMARY KEY NOT NULL, \n" +
                "          content TEXT NOT NULL,\n" +
                "          created_at INT NOT NULL,\n" +
                "          kind INT NOT NULL,\n" +
                "          pubkey TEXT NOT NULL,\n" +
                "          sig TEXT NOT NULL,\n" +
                "          tags TEXT NOT NULL,\n" +
                "          positive BOOLEAN DEFAULT 1,\n" +
                "          reacted_event_id TEXT,\n" +
                "          reacted_user_id TEXT\n" +
                "        );");
        } catch (SQLException e) { }
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
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN valid_nip05 BOOLEAN DEFAULT 0;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_notes ADD COLUMN repost_id TEXT;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_relays ADD COLUMN active BOOLEAN DEFAULT 1;");
        } catch (SQLException e) { }
        try {
            database.execSQL("CREATE INDEX nostros_notes_repost_id_created_at_index ON nostros_notes(repost_id, pubkey, created_at); ");
            database.execSQL("CREATE INDEX nostros_notes_main_index ON nostros_notes(pubkey, main_event_id, created_at);");
            database.execSQL("CREATE INDEX nostros_notes_notifications_index ON nostros_notes(pubkey, user_mentioned, reply_event_id, created_at); ");
            database.execSQL("CREATE INDEX nostros_notes_repost_id_index ON nostros_notes(pubkey, repost_id); ");
            database.execSQL("CREATE INDEX nostros_notes_reply_event_id_count_index ON nostros_notes(created_at, reply_event_id); ");

            database.execSQL("CREATE INDEX nostros_direct_messages_created_at_index ON nostros_direct_messages(created_at); ");
            database.execSQL("CREATE INDEX nostros_direct_messages_created_at_conversation_id_index ON nostros_direct_messages(created_at, conversation_id); ");

            database.execSQL("CREATE INDEX nostros_reactions_created_at_reacted_event_id_index ON nostros_reactions(created_at, reacted_event_id); ");

            database.execSQL("CREATE INDEX nostros_users_contact_follower_index ON nostros_users(contact, follower); ");
            database.execSQL("CREATE INDEX nostros_users_id_name_index ON nostros_users(id, name); ");
        } catch (SQLException e) { }
        try {
            database.execSQL("DROP TABLE IF EXISTS nostros_config;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN blocked BOOLEAN DEFAULT 0;");
        } catch (SQLException e) { }
        try {
            database.execSQL("CREATE TABLE IF NOT EXISTS nostros_notes_relays(\n" +
                    "          note_id TEXT NOT NULL,\n" +
                    "          pubkey TEXT NOT NULL,\n" +
                    "          relay_url INT NOT NULL,\n" +
                    "          PRIMARY KEY (note_id, relay_url)\n" +
                    "        );");
            database.execSQL("CREATE INDEX nostros_notes_relays_note_id_index ON nostros_notes_relays(note_id);");
            database.execSQL("CREATE INDEX nostros_notes_relays_pubkey_index ON nostros_notes_relays(pubkey);");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_relays ADD COLUMN global_feed BOOLEAN DEFAULT 1;");
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN pet_at INT;");
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN follower_at INT;");
        } catch (SQLException e) { }
    }

    public void saveEvent(JSONObject data, String userPubKey, String relayUrl) throws JSONException {
        Event event = new Event(data);
        event.save(database, userPubKey, relayUrl);
    }

    public void saveRelay(Relay relay) {
        relay.save(database);
    }

    public void destroyRelay(Relay relay) {
        relay.destroy(database);
    }

    public List<Relay> getRelays(ReactApplicationContext reactContext) {
        List<Relay> relayList = new ArrayList<>();
        String query = "SELECT url, active, global_feed FROM nostros_relays;";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {});
        if (cursor.getCount() > 0) {
            cursor.moveToFirst();
            while (!cursor.isAfterLast()) {
                try {
                    String relayUrl = cursor.getString(0);
                    int active = cursor.getInt(1);
                    int globalFeed = cursor.getInt(2);
                    Relay relay = new Relay(relayUrl, active, globalFeed,this, reactContext);
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
