package com.nostros.classes;

import android.annotation.SuppressLint;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.UUID;

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
                    saveNote(database, userPubKey);
                } else if (kind.equals("3")) {
                    if (pubkey.equals(userPubKey)) {
                        savePets(database);
                    } else {
                        saveFollower(database, userPubKey);
                    }
                } else if (kind.equals("4")) {
                    saveDirectMessage(database);
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
                if (tag.length() > 3 && tag.getString(3).equals("root")) {
                    mainEventId = tag.getString(1);
                }
            }
            if (mainEventId == null && eTags.length() > 0) {
                mainEventId = eTags.getJSONArray(0).getString(1);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

        return mainEventId;
    }

    protected String getReplyEventId() {
        JSONArray eTags = filterTags("e");
        String replyEventId = null;
        try {
            for (int i = 0; i < eTags.length(); ++i) {
                JSONArray tag = eTags.getJSONArray(i);
                if (tag.length() > 3 && tag.getString(3).equals("reply")) {
                    replyEventId = tag.getString(1);
                }
            }
            if (replyEventId == null && eTags.length() > 0) {
                replyEventId = eTags.getJSONArray(eTags.length() - 1).getString(1);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

        return replyEventId;
    }

    protected Boolean getUserMentioned(String userPubKey) {
        JSONArray eTags = filterTags("p");
        Boolean userMentioned = false;
        try {
            for (int i = 0; i < eTags.length(); ++i) {
                JSONArray tag = eTags.getJSONArray(i);
                if (tag.getString(1).equals(userPubKey)) {
                    userMentioned = true;
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

        return userMentioned;
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
        } catch (JSONException e) {
            e.printStackTrace();
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
        } catch (JSONException e) {
            e.printStackTrace();
        }

        return filtered;
    }

    protected void saveNote(SQLiteDatabase database, String userPubKey) {
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
        values.put("user_mentioned", getUserMentioned(userPubKey));
        database.replace("nostros_notes", null, values);
    }

    protected void saveDirectMessage(SQLiteDatabase database) throws JSONException {
        JSONArray tag = tags.getJSONArray(0);
        ArrayList<String> identifiers = new ArrayList<>();
        identifiers.add(pubkey);
        identifiers.add(tag.getString(1));
        Collections.sort(identifiers);
        String conversationId = UUID.nameUUIDFromBytes(identifiers.toString().getBytes()).toString();

        ContentValues values = new ContentValues();
        values.put("id", id);
        values.put("content", content.replace("'", "''"));
        values.put("created_at", created_at);
        values.put("kind", kind);
        values.put("pubkey", pubkey);
        values.put("sig", sig);
        values.put("tags", tags.toString());
        values.put("conversation_id", conversationId);

        String query = "SELECT read FROM nostros_direct_messages WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {id});
        if (cursor.getCount() == 0) {
            database.insert("nostros_direct_messages", null, values);
        } else {
            String whereClause = "id = ?";
            String[] whereArgs = new String[] {
                    id
            };
            values.put("read", cursor.getInt(0));
            database.update("nostros_direct_messages", values, whereClause, whereArgs);
        }
    }

    protected void saveUserMeta(SQLiteDatabase database) throws JSONException {
        JSONObject userContent = new JSONObject(content);
        String query = "SELECT created_at FROM nostros_users WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {pubkey});

        ContentValues values = new ContentValues();
        values.put("name", userContent.optString("name"));
        values.put("picture", userContent.optString("picture"));
        values.put("about", userContent.optString("about"));
        values.put("lnurl", userContent.optString("lnurl"));
        values.put("main_relay", userContent.optString("main_relay"));
        values.put("created_at", created_at);
        if (cursor.getCount() == 0) {
            values.put("id", pubkey);
            database.insert("nostros_users", null, values);
        } else if (cursor.moveToFirst() && created_at > cursor.getInt(0)) {
            String whereClause = "id = ?";
            String[] whereArgs = new String[] {
                    this.pubkey
            };
            database.update("nostros_users", values, whereClause, whereArgs);
        }
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
            if (tag.getString(1).equals(userPubKey)) {
                String query = "SELECT * FROM nostros_users WHERE id = ?";
                Cursor cursor = database.rawQuery(query, new String[] {pubkey});

                ContentValues values = new ContentValues();
                if (cursor.getCount() == 0) {
                    values.put("id", pubkey);
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
