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
                    saveNote(database, userPubKey);
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
                } else if (kind.equals("40")) {
                    saveGroup(database);
                } else if (kind.equals("41")) {
                    updateGroup(database);
                } else if (kind.equals("42")) {
                    saveGroupMessage(database, userPubKey);
                } else if (kind.equals("43")) {
                    hideGroupMessage(database);
                } else if (kind.equals("44")) {
                    muteUser(database);
                } else if (kind.equals("10002")) {
                    saveRelayMetadata(database);
                } else if (kind.equals("9735")) {
                    saveZap(database);
                } else if (kind.equals("10000") || kind.equals("10001") || kind.equals("30001")) {
                    saveList(database);
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

    protected int getUserMentioned(String userPubKey) {
        JSONArray pTags = filterTags("p");
        int userMentioned = 0;
        try {
            for (int i = 0; i < pTags.length(); ++i) {
                JSONArray tag = pTags.getJSONArray(i);
                if (tag.getString(1).equals(userPubKey)) {
                    userMentioned = 1;
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

        if (name.length() == 0) return false;

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

    protected String getZapPubkey(String lnurl, String ln_address) {
        String pointer = ln_address;
        if (pointer.isEmpty() || pointer.equals("")) {
            pointer = lnurl;
        }
        if (pointer.isEmpty() || pointer.equals("")) {
            return "";
        }

        String[] parts = pointer.split("@");
        if (parts.length == 2) {
            String name = parts[0];
            String domain = parts[1];

            if (name.length() == 0) return "";

            try {
                String url = "https://" + domain + "/.well-known/lnurlp/" + name;
                JSONObject response = getJSONObjectFromURL(url);
                Boolean allowsNostr = response.getBoolean("allowsNostr");
                if (allowsNostr) {
                    String nostrPubkey = response.getString("nostrPubkey");
                    return nostrPubkey;
                }
            } catch (IOException | JSONException e) {
                e.printStackTrace();
            }
        } else {
//            try {
//                Pair<String, byte[]> words = Bech32.bech32Decode(pointer);
//            } catch (Exception e) {
//                e.printStackTrace();
//            }
        }

        return "";
    }

    protected void saveNote(SQLiteDatabase database, String userPubKey) {
        String query = "SELECT id FROM nostros_notes WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {id});

        if (cursor.getCount() == 0) {
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
    }

    protected void saveRelayMetadata(SQLiteDatabase database) {
        String query = "SELECT id FROM nostros_relay_metadata WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {id});

        if (cursor.getCount() == 0) {
            ContentValues values = new ContentValues();
            values.put("id", id);
            values.put("content", content);
            values.put("created_at", created_at);
            values.put("kind", kind);
            values.put("pubkey", pubkey);
            values.put("sig", sig);
            values.put("tags", tags.toString());
            database.replace("nostros_relay_metadata", null, values);
        }
    }

    protected void saveList(SQLiteDatabase database) {
        String query = "SELECT created_at FROM nostros_lists WHERE pubkey = ? AND kind = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {pubkey, kind});

        JSONArray dTags = filterTags("d");
        String listTag = "";
        if (dTags.length() > 0) {
            try {
                listTag = dTags.getJSONArray(0).getString(1);
            } catch (JSONException e) { }
        }

        ContentValues values = new ContentValues();
        values.put("id", id);
        values.put("content", content);
        values.put("created_at", created_at);
        values.put("kind", kind);
        values.put("pubkey", pubkey);
        values.put("sig", sig);
        values.put("tags", tags.toString());
        values.put("list_tag", listTag);
        if (cursor.getCount() == 0) {
            database.insert("nostros_lists", null, values);
        } else if (cursor.moveToFirst()) {
            if (created_at > cursor.getInt(0)) {
                String whereClause = "pubkey = ? AND kind = ?";
                String[] whereArgs = new String[]{pubkey, kind};
                database.update("nostros_lists", values, whereClause, whereArgs);
            }
        }
    }

    protected void muteUser(SQLiteDatabase database) throws JSONException {
        JSONArray pTags = filterTags("p");
        String groupId = pTags.getJSONArray(0).getString(1);
        String query = "SELECT id FROM nostros_users WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {groupId});

        if (cursor.getCount() != 0) {
            ContentValues values = new ContentValues();
            values.put("muted_groups", 1);
            String whereClause = "id = ?";
            String[] whereArgs = new String[] {
                    groupId
            };
            database.update("nostros_users", values, whereClause, whereArgs);
        }
    }

    protected void hideGroupMessage(SQLiteDatabase database) throws JSONException {
        JSONArray eTags = filterTags("e");
        String groupId = eTags.getJSONArray(0).getString(1);
        String query = "SELECT id FROM nostros_group_messages WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {groupId});

        if (cursor.getCount() == 0) {
            ContentValues values = new ContentValues();
            values.put("hidden", 1);
            String whereClause = "id = ?";
            String[] whereArgs = new String[] {
                    groupId
            };
            database.update("nostros_group_messages", values, whereClause, whereArgs);
        }
    }

    protected void saveGroup(SQLiteDatabase database) throws JSONException {
        JSONObject groupContent = new JSONObject(content);
        String query = "SELECT created_at, pubkey FROM nostros_group_meta WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {id});

        ContentValues values = new ContentValues();
        values.put("content", content);
        values.put("kind", kind);
        values.put("pubkey", pubkey);
        values.put("sig", sig);
        values.put("tags", tags.toString());

        if (cursor.getCount() == 0) {
            values.put("name", groupContent.optString("name"));
            values.put("about", groupContent.optString("about"));
            values.put("picture", groupContent.optString("picture"));
            values.put("id", id);
            values.put("created_at", created_at);
            database.insert("nostros_group_meta", null, values);
        } else if (cursor.moveToFirst()) {
            if (created_at > cursor.getInt(0)) {
                values.put("name", groupContent.optString("name"));
                values.put("about", groupContent.optString("about"));
                values.put("picture", groupContent.optString("picture"));
                values.put("created_at", created_at);
            }
            String whereClause = "id = ?";
            String[] whereArgs = new String[] {
                    id
            };
            database.update("nostros_group_meta", values, whereClause, whereArgs);
        }
    }

    protected void updateGroup(SQLiteDatabase database) throws JSONException {
        JSONObject groupContent = new JSONObject(content);
        JSONArray eTags = filterTags("e");
        String groupId = eTags.getJSONArray(0).getString(1);
        String query = "SELECT created_at, deleted FROM nostros_group_meta WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {groupId});

        ContentValues values = new ContentValues();
        values.put("name", groupContent.optString("name"));
        values.put("about", groupContent.optString("about"));
        values.put("picture", groupContent.optString("picture"));
        values.put("created_at", created_at);

        if (cursor.getCount() == 0) {
            values.put("id", groupId);
            values.put("content", content);
            values.put("kind", kind);
            values.put("pubkey", pubkey);
            values.put("sig", sig);
            values.put("tags", tags.toString());
            values.put("deleted", 0);
            database.insert("nostros_group_meta", null, values);
        } else if (cursor.moveToFirst() && created_at > cursor.getInt(0)) {
            String whereClause = "id = ?";
            String[] whereArgs = new String[] {
                    groupId
            };
            database.update("nostros_group_meta", values, whereClause, whereArgs);
        }
    }

    protected void saveGroupMessage(SQLiteDatabase database, String userPubKey) throws JSONException {
        String query = "SELECT created_at FROM nostros_group_messages WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {id});

        if (cursor.getCount() == 0) {
            JSONArray eTags = filterTags("e");
            String groupId = eTags.getJSONArray(0).getString(1);

            ContentValues values = new ContentValues();
            values.put("id", id);
            values.put("content", content);
            values.put("created_at", created_at);
            values.put("kind", kind);
            values.put("pubkey", pubkey);
            values.put("sig", sig);
            values.put("tags", tags.toString());
            values.put("group_id", groupId);
            values.put("user_mentioned", getUserMentioned(userPubKey));
            if (cursor.getCount() == 0) {
                values.put("read", 0);
            }

            database.insert("nostros_group_messages", null, values);
        }
    }

    protected void saveDirectMessage(SQLiteDatabase database) throws JSONException {
        String query = "SELECT created_at FROM nostros_direct_messages WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {id});

        if (cursor.getCount() == 0) {
            JSONArray tag = tags.getJSONArray(0);
            ArrayList<String> identifiers = new ArrayList<>();
            identifiers.add(pubkey);
            identifiers.add(tag.getString(1));
            Collections.sort(identifiers);
            String conversationId = UUID.nameUUIDFromBytes(identifiers.toString().getBytes()).toString();

            ContentValues values = new ContentValues();
            values.put("id", id);
            values.put("content", content);
            values.put("created_at", created_at);
            values.put("kind", kind);
            values.put("pubkey", pubkey);
            values.put("sig", sig);
            values.put("tags", tags.toString());
            values.put("conversation_id", conversationId);
            values.put("read", 0);

            database.insert("nostros_direct_messages", null, values);
        }
    }

    protected void saveReaction(SQLiteDatabase database) throws JSONException {
        String query = "SELECT created_at FROM nostros_reactions WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {id});

        if (cursor.getCount() == 0) {
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
            values.put("content", content);
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
    }

    protected void saveUserMeta(SQLiteDatabase database) throws JSONException {
        JSONObject userContent = new JSONObject(content);
        String query = "SELECT created_at, name FROM nostros_users WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {pubkey});

        String nip05 = userContent.optString("nip05");
        String lnurl = userContent.optString("lud06");
        String ln_address = userContent.optString("lud16");
        String name = userContent.optString("name");

        ContentValues values = new ContentValues();
        values.put("name", name);
        values.put("picture", userContent.optString("picture"));
        values.put("about", userContent.optString("about"));
        values.put("lnurl", lnurl);
        values.put("ln_address", ln_address);
        values.put("nip05", nip05);
        values.put("main_relay", userContent.optString("main_relay"));
        values.put("created_at", created_at);
        if (cursor.getCount() == 0) {
            values.put("valid_nip05", validateNip05(nip05) ? 1 : 0);
            values.put("zap_pubkey", getZapPubkey(lnurl, ln_address));
            values.put("id", pubkey);
            values.put("blocked", 0);
            database.insert("nostros_users", null, values);
        } else if (cursor.moveToFirst()){
            String whereClause = "id = ?";
            String[] whereArgs = new String[]{
                    this.pubkey
            };
            if (created_at > cursor.getInt(0)) {
                values.put("zap_pubkey", getZapPubkey(lnurl, ln_address));
                values.put("valid_nip05", validateNip05(nip05) ? 1 : 0);
                database.update("nostros_users", values, whereClause, whereArgs);
            } else if (cursor.getString(1).equals("")) {
                ContentValues nameValues = new ContentValues();
                nameValues.put("name", name);
                database.update("nostros_users", nameValues, whereClause, whereArgs);
            }
        }
    }

    protected void saveZap(SQLiteDatabase database) throws JSONException {
        String query = "SELECT created_at FROM nostros_zaps WHERE id = ?";
        @SuppressLint("Recycle") Cursor cursor = database.rawQuery(query, new String[] {id});

        if (cursor.getCount() == 0) {
            JSONArray pTags = filterTags("p");
            JSONArray eTags = filterTags("e");
            JSONArray bolt11Tags = filterTags("bolt11");
            JSONArray descriptionTags = filterTags("description");

            String zapped_event_id = "";
            String zapped_user_id = "";
            String zapper_user_id = "";
            double amount = 0;
            if (descriptionTags.length() > 0) {
                JSONArray tag = descriptionTags.getJSONArray(0);
                JSONObject description = new JSONObject(tag.getString(1));
                zapper_user_id = description.getString("pubkey");
            }
            if (bolt11Tags.length() > 0) {
                String lnbc = bolt11Tags.getJSONArray(0).getString(1);
                amount = getLnAmount(lnbc);
            }
            if (eTags.length() > 0) {
                zapped_event_id = eTags.getJSONArray(eTags.length() - 1).getString(1);
            }
            if (pTags.length() > 0) {
                zapped_user_id = pTags.getJSONArray(pTags.length() - 1).getString(1);
            }

            String userQuery = "SELECT created_at FROM nostros_users WHERE zap_pubkey = ? AND zapped_user_id = ?";
            @SuppressLint("Recycle") Cursor userCursor = database.rawQuery(userQuery, new String[] {pubkey, zapped_user_id});

            if (userCursor.moveToFirst()) {
                ContentValues values = new ContentValues();
                values.put("id", id);
                values.put("content", content);
                values.put("created_at", created_at);
                values.put("kind", kind);
                values.put("pubkey", pubkey);
                values.put("sig", sig);
                values.put("tags", tags.toString());
                values.put("amount", amount);
                values.put("zapped_user_id", zapped_user_id);
                values.put("zapped_event_id", zapped_event_id);
                values.put("zapper_user_id", zapper_user_id);

                database.insert("nostros_zaps", null, values);
            }
        }
    }

    protected void savePets(SQLiteDatabase database) throws JSONException {
        String queryLast = "SELECT pet_at FROM nostros_users ORDER BY pet_at DESC LIMIT 1";
        Cursor cursorLast = database.rawQuery(queryLast, new String[] {});
        if (cursorLast.moveToFirst() && created_at > cursorLast.getInt(0)) {
            ContentValues valuesIntial = new ContentValues();
            valuesIntial.put("contact", 0);
            String whereClauseInitial = "id = ?";
            database.update("nostros_users", valuesIntial, whereClauseInitial, new String[]{});

            for (int i = 0; i < tags.length(); ++i) {
                JSONArray tag = tags.getJSONArray(i);
                String petId = tag.getString(1);
                String query = "SELECT * FROM nostros_users WHERE id = ?";
                Cursor cursor = database.rawQuery(query, new String[] {petId});
                ContentValues values = new ContentValues();
                values.put("pet_at", created_at);
                values.put("contact", 1);
                values.put("blocked", 0);

                if (cursor.getCount() == 0) {
                    values.put("id", petId);
                    database.insert("nostros_users", null, values);
                } else {
                    String whereClause = "id = ?";
                    String[] whereArgs = new String[] {
                            petId
                    };
                    database.update("nostros_users", values, whereClause, whereArgs);
                }
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

    protected static double getLnAmount(String lnbc) {
        double amount = 0.0;
        Matcher mili = Pattern.compile("^lnbc(\\d*)m\\S*$").matcher(lnbc);
        Matcher micro = Pattern.compile("^lnbc(\\d*)u\\S*$").matcher(lnbc);
        Matcher nano = Pattern.compile("^lnbc(\\d*)n\\S*$").matcher(lnbc);
        Matcher pico = Pattern.compile("^lnbc(\\d*)p\\S*$").matcher(lnbc);

        if (mili.find()) {
            amount = 100000 * Integer.parseInt(mili.group(1));
        } else if (micro.find()) {
            amount = 100 * Integer.parseInt(micro.group(1));
        } else if (nano.find()) {
            amount = 0.1 * Integer.parseInt(nano.group(1));
        } else if (pico.find()) {
            amount = 0.0001 * Integer.parseInt(pico.group(1));
        }

        return amount;
    }
}
