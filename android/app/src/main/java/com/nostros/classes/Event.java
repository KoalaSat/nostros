package com.nostros.classes;

import android.annotation.SuppressLint;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    public void save(SQLiteDatabase database, String userPubKey, String relayUrl) {
        if (isValid()) {
            try {
                ContentValues relayValues = new ContentValues();
                relayValues.put("note_id", id);
                relayValues.put("pubkey", pubkey);
                relayValues.put("relay_url", relayUrl);
                database.replace("nostros_notes_relays", null, relayValues);

                if (kind.equals("0")) {
                    saveUserMeta(database);
                } else if (kind.equals("1") || kind.equals("2")) {
                    saveNote(database, userPubKey, relayUrl);
                } else if (kind.equals("3")) {
                    if (pubkey.equals(userPubKey)) {
                        savePets(database);
                    } else {
                        saveFollower(database, userPubKey);
                    }
                } else if (kind.equals("4")) {
                    saveDirectMessage(database);
                } else if (kind.equals("7")) {
                    saveReaction(database);
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
    }

    protected boolean isValid() {
        return !id.isEmpty() && !sig.isEmpty() && created_at <= System.currentTimeMillis() / 1000L;
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
            if (eTags.length() > 0) {
                replyEventId = eTags.getJSONArray(eTags.length() - 1).getString(1);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

        return replyEventId;
    }

    protected Boolean getUserMentioned(String userPubKey) {
        JSONArray pTags = filterTags("p");
        Boolean userMentioned = false;
        try {
            for (int i = 0; i < pTags.length(); ++i) {
                JSONArray tag = pTags.getJSONArray(i);
                if (tag.getString(1).equals(userPubKey)) {
                    userMentioned = true;
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

        return userMentioned;
    }

    protected String getRepostId() {
        String match = null;
        Matcher m = Pattern.compile("#\\[(\\d+)\\]").matcher(content);
        while (m.find()) {
            int position = Integer.parseInt(m.group(1));
            try {
                JSONArray tag = tags.getJSONArray(position);
                String tagKind = tag.getString(0);
                if (tagKind.equals("e")) {
                    match = tag.getString(1);
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
        return match;
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

    protected boolean validateNip05(String nip05) {
        String[] parts = nip05.split("@");
        if (parts.length < 2) return false;

        String name = parts[0];
        String domain = parts[1];

        if (!name.matches("^[a-z0-9-_]+$")) return false;

        try {
            String url = "https://" + domain + "/.well-known/nostr.json?name=" + name;
            JSONObject response = getJSONObjectFromURL(url);
            JSONObject names = response.getJSONObject("names");
            String key = names.getString(name);

            return key.equals(pubkey);
        } catch (IOException | JSONException e) {
            e.printStackTrace();
        }

        return false;
    }

    protected void saveNote(SQLiteDatabase database, String userPubKey, String relayUrl) {
        ContentValues values = new ContentValues();
        values.put("id", id);
        values.put("content", content);
        values.put("created_at", created_at);
        values.put("kind", kind);
        values.put("pubkey", pubkey);
        values.put("sig", sig);
        values.put("tags", tags.toString());
        values.put("main_event_id", getMainEventId());
        values.put("reply_event_id", getReplyEventId());
        values.put("user_mentioned", getUserMentioned(userPubKey));
        values.put("repost_id", getRepostId());
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

        database.insert("nostros_direct_messages", null, values);
    }

    protected void saveReaction(SQLiteDatabase database) throws JSONException {
        JSONArray pTags = filterTags("p");
        JSONArray eTags = filterTags("e");

        String reacted_event_id = "";
        String reacted_user_id = "";
        if (eTags.length() > 0) {
            reacted_event_id = eTags.getJSONArray(eTags.length() - 1).getString(1);
        }
        if (pTags.length() > 0) {
            reacted_user_id = pTags.getJSONArray(pTags.length() - 1).getString(1);
        }

        ContentValues values = new ContentValues();
        values.put("id", id);
        values.put("content", content.replace("'", "''"));
        values.put("created_at", created_at);
        values.put("kind", kind);
        values.put("pubkey", pubkey);
        values.put("sig", sig);
        values.put("tags", tags.toString());
        values.put("positive", !content.equals("-"));
        values.put("reacted_event_id", reacted_event_id);
        values.put("reacted_user_id", reacted_user_id);

        database.insert("nostros_reactions", null, values);
    }

    protected void saveUserMeta(SQLiteDatabase database) throws JSONException {
        JSONObject userContent = new JSONObject(content);
        String query = "SELECT created_at, valid_nip05, nip05 FROM nostros_users WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {pubkey});

        String nip05 = userContent.optString("nip05");

        ContentValues values = new ContentValues();
        values.put("name", userContent.optString("name"));
        values.put("picture", userContent.optString("picture"));
        values.put("about", userContent.optString("about"));
        values.put("lnurl", userContent.optString("lud06"));
        values.put("nip05", nip05);
        values.put("main_relay", userContent.optString("main_relay"));
        values.put("created_at", created_at);
        if (cursor.getCount() == 0) {
            values.put("id", pubkey);
            values.put("valid_nip05", validateNip05(nip05) ? 1 : 0);
            values.put("blocked", 0);
            database.insert("nostros_users", null, values);
        } else if (cursor.moveToFirst() && (cursor.isNull(0) || created_at > cursor.getInt(0))) {
            if (cursor.getInt(1) == 0 || !cursor.getString(2).equals(nip05)) {
                values.put("valid_nip05", validateNip05(nip05) ? 1 : 0);
            }
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
            String relay = tag.getString(2);
            String name = "";
            if (tag.length() >= 4) {
                name = tag.getString(3);
            }
            String query = "SELECT * FROM nostros_users WHERE id = ?";
            Cursor cursor = database.rawQuery(query, new String[] {petId});
            if (cursor.getCount() == 0) {
                ContentValues values = new ContentValues();
                values.put("id", petId);
                values.put("name", name);
                values.put("contact", true);
                values.put("blocked", 0);
                values.put("main_relay", relay);
                values.put("pet_at", created_at);
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
                    values.put("follower_at", created_at);
                    database.insert("nostros_users", null, values);
                } else {
                    String whereClause = "id = ?";
                    String[] whereArgs = new String[] {
                            this.pubkey
                    };
                    values.put("follower", true);
                    values.put("follower_at", created_at);
                    database.update("nostros_users", values, whereClause, whereArgs);
                }
            }
        }
    }

    protected static JSONObject getJSONObjectFromURL(String urlString) throws JSONException, IOException {
        HttpURLConnection urlConnection = null;

        URL url = new URL(urlString);

        urlConnection = (HttpURLConnection) url.openConnection();

        urlConnection.setRequestMethod("GET");
        urlConnection.setReadTimeout(10000 /* milliseconds */);
        urlConnection.setConnectTimeout(15000 /* milliseconds */);

        urlConnection.setDoOutput(true);

        urlConnection.connect();

        BufferedReader br=new BufferedReader(new InputStreamReader(url.openStream()));

        String jsonString;

        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            sb.append(line+"\n");
        }
        br.close();

        jsonString = sb.toString();

        System.out.println("JSON: " + jsonString);
        urlConnection.disconnect();

        return new JSONObject(jsonString);
    }
}
