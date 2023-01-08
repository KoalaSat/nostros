package com.nostros.classes;

import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.neovisionaries.ws.client.HostnameUnverifiedException;
import com.neovisionaries.ws.client.OpeningHandshakeException;
import com.neovisionaries.ws.client.WebSocket;
import com.neovisionaries.ws.client.WebSocketAdapter;
import com.neovisionaries.ws.client.WebSocketException;
import com.neovisionaries.ws.client.WebSocketFactory;
import com.neovisionaries.ws.client.WebSocketFrame;
import com.nostros.modules.DatabaseModule;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;

public class Websocket {
    private WebSocket webSocket;
    private DatabaseModule database;
    private String url;
    private ReactApplicationContext context;

    public Websocket(String serverUrl, DatabaseModule databaseModule, ReactApplicationContext reactContext) {
        database = databaseModule;
        url = serverUrl;
        context = reactContext;
    }

    public void send(String message) {
        Log.d("Websocket", "SEND URL:" + url + " __ " + message);
        webSocket.sendText(message);
    }

    public void disconnect() {
        webSocket.disconnect();
    }

    public void connect(String userPubKey) throws IOException {
        WebSocketFactory factory = new WebSocketFactory();
        webSocket = factory.createSocket(url);
        webSocket.setMissingCloseFrameAllowed(true);
        webSocket.setPingInterval(25 * 1000);

        webSocket.addListener(new WebSocketAdapter() {
            @Override
            public void onTextMessage(WebSocket websocket, String message) throws Exception {
                Log.d("Websocket", "RECEIVE URL:" + url + " __ " + message);
                JSONArray jsonArray = new JSONArray(message);
                if (jsonArray.get(0).toString().equals("EVENT")) {
                    JSONObject data = jsonArray.getJSONObject(2);
                    database.saveEvent(data, userPubKey);
                    reactNativeEvent(data.getString("id"));
                }
            }
            @Override
            public void onDisconnected(WebSocket ws, WebSocketFrame serverCloseFrame,
                                       WebSocketFrame clientCloseFrame, boolean closedByServer) {
                ws.connectAsynchronously();
            }
        });
        webSocket.connectAsynchronously();
    }

    public void reactNativeEvent(String eventId) {
        WritableMap payload = Arguments.createMap();
        payload.putString("eventId", eventId);
        context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("WebsocketEvent", payload);
    }
}
