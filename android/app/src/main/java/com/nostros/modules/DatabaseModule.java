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
                "        contact INT DEFAULT 0,\n" +
                "        follower INT DEFAULT 0\n" +
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
                "          read INT DEFAULT 0\n" +
                "        );");
        try {
            database.execSQL("ALTER TABLE nostros_notes ADD COLUMN user_mentioned INT DEFAULT 0;");
            database.execSQL("ALTER TABLE nostros_notes ADD COLUMN seen INT DEFAULT 0;");
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
                "          positive INT DEFAULT 1,\n" +
                "          reacted_event_id TEXT,\n" +
                "          reacted_user_id TEXT\n" +
                "        );");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN nip05 TEXT;");
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN valid_nip05 INT DEFAULT 0;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_notes ADD COLUMN repost_id TEXT;");
            database.execSQL("ALTER TABLE nostros_relays ADD COLUMN active INT DEFAULT 1;");
        } catch (SQLException e) { }
        try {
            database.execSQL("DROP TABLE IF EXISTS nostros_config;");
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN blocked INT DEFAULT 0;");
        } catch (SQLException e) { }
        try {
            database.execSQL("CREATE TABLE IF NOT EXISTS nostros_notes_relays(\n" +
                    "          note_id TEXT NOT NULL,\n" +
                    "          pubkey TEXT NOT NULL,\n" +
                    "          relay_url INT NOT NULL,\n" +
                    "          PRIMARY KEY (note_id, relay_url)\n" +
                    "        );");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN pet_at INT;");
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN follower_at INT;");
            database.execSQL("ALTER TABLE nostros_relays ADD COLUMN global_feed INT DEFAULT 1;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_relays ADD COLUMN resilient INT DEFAULT 0;");
            database.execSQL("ALTER TABLE nostros_relays ADD COLUMN manual INT DEFAULT 1;");
        } catch (SQLException e) { }
        try {
            database.execSQL("CREATE TABLE IF NOT EXISTS nostros_group_meta(\n" +
                    "          id TEXT PRIMARY KEY NOT NULL, \n" +
                    "          content TEXT,\n" +
                    "          created_at INT,\n" +
                    "          kind INT,\n" +
                    "          pubkey TEXT,\n" +
                    "          sig TEXT,\n" +
                    "          tags TEXT,\n" +
                    "          name TEXT,\n" +
                    "          about TEXT,\n" +
                    "          picture TEXT\n" +
                    "        );");
            database.execSQL("CREATE TABLE IF NOT EXISTS nostros_group_messages(\n" +
                    "          id TEXT PRIMARY KEY NOT NULL, \n" +
                    "          content TEXT NOT NULL,\n" +
                    "          created_at INT NOT NULL,\n" +
                    "          kind INT NOT NULL,\n" +
                    "          pubkey TEXT NOT NULL,\n" +
                    "          sig TEXT NOT NULL,\n" +
                    "          tags TEXT NOT NULL,\n" +
                    "          group_id TEXT NOT NULL,\n" +
                    "          hidden INT DEFAULT 0\n" +
                    "        );");
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN muted_groups INT DEFAULT 0;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_group_meta ADD COLUMN deleted INT DEFAULT 0;");
            database.execSQL("ALTER TABLE nostros_group_messages ADD COLUMN read INT DEFAULT 0;");
            database.execSQL("ALTER TABLE nostros_group_messages ADD COLUMN user_mentioned INT DEFAULT 0;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_relays ADD COLUMN updated_at INT DEFAULT 0;");
            database.execSQL("ALTER TABLE nostros_relays ADD COLUMN mode TEXT;");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN ln_address TEXT;");
            database.execSQL("UPDATE nostros_users SET ln_address=lnurl;");
            database.execSQL("ALTER TABLE nostros_users ADD COLUMN zap_pubkey TEXT;");
            database.execSQL("CREATE TABLE IF NOT EXISTS nostros_zaps(\n" +
                    "          id TEXT PRIMARY KEY NOT NULL, \n" +
                    "          content TEXT NOT NULL,\n" +
                    "          created_at INT NOT NULL,\n" +
                    "          kind INT NOT NULL,\n" +
                    "          pubkey TEXT NOT NULL,\n" +
                    "          sig TEXT NOT NULL,\n" +
                    "          tags TEXT NOT NULL,\n" +
                    "          amount FLOAT NOT NULL,\n" +
                    "          zapped_user_id TEXT NOT NULL,\n" +
                    "          zapper_user_id TEXT NOT NULL,\n" +
                    "          zapped_event_id TEXT\n" +
                    "        );");
            database.execSQL("CREATE INDEX nostros_nostros_zaps_zapped_event_id_index ON nostros_zaps(zapped_event_id);");
        } catch (SQLException e) { }
        try {
            database.execSQL("ALTER TABLE nostros_relays ADD COLUMN deleted_at INT DEFAULT 0;");
        } catch (SQLException e) { }
        try {
            database.execSQL("DROP INDEX nostros_notes_notifications_index;");
        } catch (SQLException e) { }
        try {
            database.execSQL("CREATE INDEX nostros_notes_relays_notes_index ON nostros_notes_relays(note_id, relay_url);");
            database.execSQL("CREATE INDEX nostros_notes_relays_users_index ON nostros_notes_relays(pubkey, relay_url);");

            database.execSQL("CREATE INDEX nostros_direct_messages_feed_index ON nostros_direct_messages(pubkey, created_at); ");
            database.execSQL("CREATE INDEX nostros_direct_messages_notification_index ON nostros_direct_messages(pubkey, read); ");
            database.execSQL("CREATE INDEX nostros_direct_messages_conversation_index ON nostros_direct_messages(created_at, conversation_id); ");

            database.execSQL("CREATE INDEX nostros_reactions_pubkey_index ON nostros_reactions(pubkey); ");
            database.execSQL("CREATE INDEX nostros_reactions_reacted_event_id_index ON nostros_reactions(reacted_event_id); ");
            database.execSQL("CREATE INDEX nostros_reactions_created_at_reacted_event_id_index ON nostros_reactions(created_at, reacted_event_id); ");

            database.execSQL("CREATE INDEX nostros_users_contact_follower_index ON nostros_users(contact, follower); ");
            database.execSQL("CREATE INDEX nostros_users_names_index ON nostros_users(id, name); ");
            database.execSQL("CREATE INDEX nostros_users_contacts_index ON nostros_users(id, contact); ");
            database.execSQL("CREATE INDEX nostros_users_blocked_index ON nostros_users(id, blocked); ");
            database.execSQL("CREATE INDEX nostros_users_muted_index ON nostros_users(id, muted_groups); ");
            database.execSQL("CREATE INDEX nostros_users_contact_index ON nostros_users(contact); ");

            database.execSQL("CREATE INDEX nostros_notes_home_index ON nostros_notes(pubkey, created_at, main_event_id, repost_id); ");
            database.execSQL("CREATE INDEX nostros_notes_notifications_index ON nostros_notes(pubkey, user_mentioned, reply_event_id, created_at); ");
            database.execSQL("CREATE INDEX nostros_notes_reply_index ON nostros_notes(reply_event_id); ");
            database.execSQL("CREATE INDEX nostros_notes_list_index ON nostros_notes(pubkey, created_at); ");
            database.execSQL("CREATE INDEX nostros_notes_repost_count_index ON nostros_notes(pubkey, repost_id, created_at); ");

            database.execSQL("CREATE INDEX nostros_group_messages_mentions_index ON nostros_group_messages(group_id, pubkey, created_at);");
            database.execSQL("CREATE INDEX nostros_group_messages_group_index ON nostros_group_messages(group_id, created_at);");
            database.execSQL("CREATE INDEX nostros_group_messages_feed_index ON nostros_group_messages(user_mentioned, read, group_id);");
        } catch (SQLException e) { }
    }

    public void saveEvent(JSONObject data, String userPubKey, String relayUrl) throws JSONException {
        Event event = new Event(data);
        event.save(database, userPubKey, relayUrl);
    }

    public void saveRelay(Relay relay) {
        relay.save(database);
    }

    public void deleteRelay(Relay relay) {
        relay.delete(database);
    }

    public List<Relay> getRelays(ReactApplicationContext reactContext) {
        List<Relay> relayList = new ArrayList<>();
        String query = "SELECT url, active, global_feed FROM nostros_relays WHERE deleted_at = 0 AND active = 1;";
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
