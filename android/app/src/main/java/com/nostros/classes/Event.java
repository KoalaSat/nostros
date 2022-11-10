package com.nostros.classes;

import android.annotation.SuppressLint;
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
        content = data.optString("content");
        id = data.getString("id");
        kind = data.getString("kind");
        pubkey = data.getString("pubkey");
        sig = data.getString("sig");
        tags = data.getJSONArray("tags");
    }

    public void save(SQLiteDatabase database, String userPubKey) {
        if (isValid()) {
            try {
                if (kind.equals("0")) {
                    saveUserMeta(database);
                } else if (kind.equals("1") || kind.equals("2")) {
                    saveNote(database);
                } else if (kind.equals("3")) {
                    if (pubkey.equals(userPubKey)) {
                        savePets(database);
                    } else {
                        saveFollower(database, userPubKey);
                    }
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
    }

    protected boolean isValid() {
        return !id.isEmpty() && !sig.isEmpty();
    }

    protected String getMainEventId() {
        JSONArray eTags = filterTags("e");
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
        JSONArray eTags = filterTags("e");
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

    protected String saveFollower(String pubKey) {
        JSONArray eTags = filterTags("p");
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

    protected JSONArray filterTags(String kind) {
        JSONArray filtered = new JSONArray();

        try {
            for (int i = 0; i < tags.length(); ++i) {
                JSONArray tag = tags.getJSONArray(i);
                String tagKind = tag.getString(0);
                if (tagKind.equals(kind)) {
                    filtered.put(tag);
                }
            }
        } catch (JSONException ignored) {

        }

        return filtered;
    }

    protected void saveNote(SQLiteDatabase database) {
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
        database.replace("nostros_notes", null, values);
    }

    protected void saveUserMeta(SQLiteDatabase database) throws JSONException {
        String[] tableColumns = new String[] {
                "contact",
                "follower"
        };
        String whereClause = "id = ?";
        String[] whereArgs = new String[] {
                this.pubkey
        };
        @SuppressLint("Recycle") Cursor cursor = database.query("nostros_users", tableColumns, whereClause, whereArgs, null, null, null);

        JSONObject userContent = new JSONObject(content);
        ContentValues values = new ContentValues();
        values.put("id", pubkey);
        values.put("name", userContent.optString("name"));
        values.put("picture", userContent.optString("picture"));
        values.put("about", userContent.optString("about"));
        values.put("main_relay", userContent.optString("main_relay"));
        values.put("contact", cursor.getInt(0));
        values.put("follower", cursor.getInt(1));
        database.replace("nostros_users", null, values);
    }

    protected void savePets(SQLiteDatabase database) throws JSONException {
            for (int i = 0; i < tags.length(); ++i) {
                JSONArray tag = tags.getJSONArray(i);
                String petId = tag.getString(1);
                String query = "SELECT * FROM nostros_users WHERE id = ?";
                Cursor cursor = database.rawQuery(query, new String[] {petId});
                if (cursor.getCount() == 0) {
                    ContentValues values = new ContentValues();
                    values.put("id", petId);
                    values.put("name", tag.getString(3));
                    values.put("contact", true);
                    database.insert("nostros_users", null, values);
                }
            }
    }

    protected void saveFollower(SQLiteDatabase database, String userPubKey) throws JSONException {
        JSONArray pTags = filterTags("p");
        for (int i = 0; i < pTags.length(); ++i) {
            JSONArray tag = pTags.getJSONArray(i);

            String query = "SELECT * FROM nostros_users WHERE id = ?";
            Cursor cursor = database.rawQuery(query, new String[] {pubkey});

            ContentValues values = new ContentValues();
            values.put("id", pubkey);
            if (tag.getString(1).equals(userPubKey)) {
                if (cursor.getCount() == 0) {
                    values.put("follower", true);
                    database.insert("nostros_users", null, values);
                } else {
                    String whereClause = "id = ?";
                    String[] whereArgs = new String[] {
                            this.pubkey
                    };
                    values.put("follower", true);
                    database.update("nostros_users", values, whereClause, whereArgs);
                }
            }
        }
    }
}
