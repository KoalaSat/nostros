package com.nostros.classes;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class Event {
    private final int created_at;
    private final String content;
    private final String id;
    private final String kind;
    private final String pubkey;
    private final String sig;
    private final JSONArray tags;

    public Event(JSONObject data) throws JSONException {
        created_at = data.getInt("created_at");
        content = data.getString("content");
        id = data.getString("id");
        kind = data.getString("kind");
        pubkey = data.getString("pubkey");
        sig = data.getString("sig");
        tags = data.getJSONArray("tags");
    }

    public void save(SQLiteDatabase database) {
        Log.d("EVENT", kind);
        if (isValid()) {
            if (kind.equals("1") || kind.equals("2")) {
                saveNote(database);
            } else if (kind.equals("0")) {
                saveUser(database);
            }
        }
    }

    protected boolean isValid() {
        return !id.isEmpty() && !sig.isEmpty() && (kind.equals("1") || kind.equals("2"));
    }

    protected String getMainEventId() {
        JSONArray eTags = getETags();
        String mainEventId = null;
        try {
            for (int i = 0; i < eTags.length(); ++i) {
                JSONArray tag = eTags.getJSONArray(i);
                if (tag.getString(3).equals("root")) {
                    mainEventId = tag.getString(1);
                }
            }
            if (mainEventId == null && eTags.length() > 0) {
                mainEventId = eTags.getJSONArray(0).getString(1);
            }
        } catch (JSONException ignored) {

        }

        return mainEventId;
    }

    protected String getReplyEventId() {
        JSONArray eTags = getETags();
        String mainEventId = null;
        try {
            for (int i = 0; i < eTags.length(); ++i) {
                JSONArray tag = eTags.getJSONArray(i);
                if (tag.getString(3).equals("reply")) {
                    mainEventId = tag.getString(1);
                }
            }
            if (mainEventId == null && eTags.length() > 0) {
                mainEventId = eTags.getJSONArray(eTags.length() - 1).getString(1);
            }
        } catch (JSONException ignored) {

        }

        return mainEventId;
    }

    protected JSONArray getETags() {
        JSONArray filtered = new JSONArray();

        try {
            for (int i = 0; i < tags.length(); ++i) {
                JSONArray tag = tags.getJSONArray(i);
                String tagKind = tag.getString(0);
                if (tagKind.equals("e")) {
                    filtered.put(tag);
                }
            }
        } catch (JSONException ignored) {

        }

        return filtered;
    }

    protected void saveNote(SQLiteDatabase database) {
        String query = "SELECT nostros_notes.id FROM nostros_notes WHERE id = " + this.id + ";";
        Cursor cursor = database.rawQuery(query, null);
        if (cursor.getInt(0) == 0) {
            ContentValues values = new ContentValues();
            values.put("id", id);
            values.put("content", content.replace("'", "''"));
            values.put("created_at", created_at);
            values.put("kind", kind);
            values.put("pubkey", pubkey);
            values.put("sig", sig);
            values.put("tags", tags.toString());
            values.put("main_event_id", getMainEventId());
            values.put("reply_event_id", getReplyEventId());
            database.insert("nostros_notes", null, values);
        }
    }

    protected void saveUser(SQLiteDatabase database) {
        String queryCheck = "SELECT contact, follower FROM nostros_users WHERE id = " + this.pubkey + ";";
        Cursor cursor = database.rawQuery(queryCheck, null);
        try {
            JSONObject userContent = new JSONObject(content);
            ContentValues values = new ContentValues();
            values.put("id", pubkey);
            values.put("name", userContent.getString("name").replace("'", "''"));
            values.put("picture", userContent.getString("picture").replace("'", "''"));
            values.put("about", userContent.getString("about").replace("'", "''"));
            values.put("main_relay", userContent.getString("main_relay").replace("'", "''"));
            values.put("contact", cursor.getInt(0));
            values.put("follower", cursor.getInt(1));
            database.replace("nostros_users", null, values);
        } catch (JSONException ignored) {

        }
    }
}
