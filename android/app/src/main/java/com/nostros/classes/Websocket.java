package com.nostros.classes;

import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.nostros.modules.DatabaseModule;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.exceptions.WebsocketNotConnectedException;
import org.java_websocket.handshake.ServerHandshake;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

public class Websocket {
    private WebSocketClient webSocket;
    private DatabaseModule database;
    private String url;
    private String pubKey;
    private ReactApplicationContext context;

    public Websocket(String serverUrl, DatabaseModule databaseModule, ReactApplicationContext reactContext) {
        database = databaseModule;
        url = serverUrl;
        context = reactContext;
    }

    public void send(String message) {
        if (webSocket != null) {
            Log.d("Websocket", "SEND URL:" + url + " __ " + message);
            try {
                webSocket.send(message);
            } catch (WebsocketNotConnectedException e) {

            }
        }
    }

    public void disconnect() {
        if (webSocket != null) {
            webSocket.close();
        }
    }

    public void connect(String userPubKey) throws IOException, URISyntaxException {
        pubKey = userPubKey;
        webSocket = new WebSocketClient(new URI(url)) {
            @Override
            public void onOpen(ServerHandshake handshakedata) {

            }

            @Override
            public void onMessage(String message) {
                Log.d("Websocket", "RECEIVE URL:" + url + " __ " + message);
                JSONArray jsonArray;
                try {
                    jsonArray = new JSONArray(message);
                    String messageType = jsonArray.get(0).toString();
                    if (messageType.equals("EVENT")) {
                        JSONObject data = jsonArray.getJSONObject(2);
                        database.saveEvent(data, userPubKey);
                        reactNativeEvent(data.getString("id"));
                    } else if (messageType.equals("OK")) {
                        reactNativeConfirmation(jsonArray.get(1).toString());
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }

            @Override
            public void onClose(int code, String reason, boolean remote) {
                webSocket.connect();
            }

            @Override
            public void onError(Exception ex) {
                ex.printStackTrace();
            }
        };
        webSocket.connect();
    }

    public void reactNativeEvent(String eventId) {
        WritableMap payload = Arguments.createMap();
        payload.putString("eventId", eventId);
        context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("WebsocketEvent", payload);
    }

    public void reactNativeConfirmation(String eventId) {
        Log.d("Websocket", "reactNativeConfirmation" + eventId);
        WritableMap payload = Arguments.createMap();
        payload.putString("eventId", eventId);
        context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("WebsocketConfirmation", payload);
    }
}
