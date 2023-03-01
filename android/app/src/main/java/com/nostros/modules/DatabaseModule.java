package com.nostros.modules;

import android.annotation.SuppressLint;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.SQLException;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.nostros.classes.Database;
import com.nostros.classes.Event;
import com.nostros.classes.Relay;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class DatabaseModule extends ReactContextBaseJavaModule {
    private Database database;
    private ReactApplicationContext context;

    public DatabaseModule(ReactApplicationContext reactContext, Database databaseEntity) {
        database = databaseEntity;
        context = reactContext;
    }

    @Override
    public String getName() {
        return "DatabaseModule";
    }

    @ReactMethod
    public void updateConversationRead(String conversationId) {
        String whereClause = "conversation_id = ?";
        String[] whereArgs = new String[] {
                conversationId
        };
        ContentValues values = new ContentValues();
        values.put("read", 1);
        database.instance.update("nostros_direct_messages", values, whereClause, whereArgs);
    }

    @ReactMethod
    public void updateAllDirectMessagesRead() {
        String whereClause = "";
        String[] whereArgs = new String[] {};
        ContentValues values = new ContentValues();
        values.put("read", 1);
        database.instance.update("nostros_direct_messages", values, whereClause, whereArgs);
    }

    @ReactMethod
    public void updateUserContact(String userId, boolean contact, Callback callback) {
        String whereClause = "id = ?";
        String[] whereArgs = new String[] { userId };
        ContentValues values = new ContentValues();
        values.put("contact", contact ? 1 : 0);
        database.instance.update("nostros_users", values, whereClause, whereArgs);
        callback.invoke();
    }

    @ReactMethod
    public void updateUserBlock(String userId, boolean blocked, Callback callback) {
        String whereClause = "id = ?";
        String[] whereArgs = new String[] { userId };
        ContentValues values = new ContentValues();
        values.put("blocked", blocked ? 1 : 0);
        database.instance.update("nostros_users", values, whereClause, whereArgs);
        callback.invoke();
    }

    @ReactMethod
    public void updateUserMutesGroups(String userId, boolean muted, Callback callback) {
        String whereClause = "id = ?";
        String[] whereArgs = new String[] { userId };
        ContentValues values = new ContentValues();
        values.put("muted_groups", muted ? 1 : 0);
        database.instance.update("nostros_users", values, whereClause, whereArgs);
        callback.invoke();
    }

    @ReactMethod
    public void updateAllGroupMessagesRead() {
        String whereClause = "";
        String[] whereArgs = new String[] { };
        ContentValues values = new ContentValues();
        values.put("read", 1);
        database.instance.update("nostros_group_messages", values, whereClause, whereArgs);
    }

    @ReactMethod
    public void updateGroupRead(String groupId) {
        String whereClause = "id = ?";
        String[] whereArgs = new String[] { groupId };
        ContentValues values = new ContentValues();
        values.put("read", 1);
        database.instance.update("nostros_group_messages", values, whereClause, whereArgs);
    }

    @ReactMethod
    public void deleteGroup(String groupId) {
        String whereClause = "id = ?";
        String[] whereArgs = new String[] { groupId };
        ContentValues values = new ContentValues();
        values.put("deleted", 1);
        database.instance.update("nostros_group_meta", values, whereClause, whereArgs);
    }

    @ReactMethod
    public void activateGroup(String groupId) {
        String whereClause = "id = ?";
        String[] whereArgs = new String[] { groupId };
        ContentValues values = new ContentValues();
        values.put("deleted", 0);
        database.instance.update("nostros_group_meta", values, whereClause, whereArgs);
    }
}
