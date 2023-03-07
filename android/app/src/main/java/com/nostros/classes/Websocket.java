package com.nostros.classes;

import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.neovisionaries.ws.client.WebSocket;
import com.neovisionaries.ws.client.WebSocketAdapter;
import com.neovisionaries.ws.client.WebSocketFactory;
import com.neovisionaries.ws.client.WebSocketFrame;
import com.nostros.modules.DatabaseModule;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public class Websocket {
    private WebSocket webSocket;
    private Database database;
    private String url;
    private String pubKey;
    private ReactApplicationContext context;

    public Websocket(String serverUrl, Database databaseEntity, ReactApplicationContext reactContext) {
        database = databaseEntity;
        url = serverUrl;
        context = reactContext;
    }

    public void send(String message) {
        if (webSocket != null) {
            Log.d("Websocket", "SEND URL:" + url + " __ " + message);
            if (!webSocket.isOpen()) {
                try {
                    this.connect(pubKey);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            webSocket.sendText(message);
        }
    }

    public void disconnect() {
        if (webSocket != null) {
            webSocket.disconnect();
        }
    }

    public void connect(String userPubKey) throws IOException {
        WebSocketFactory factory = new WebSocketFactory();
        pubKey = userPubKey;
        webSocket = factory.createSocket(url);
        webSocket.setMissingCloseFrameAllowed(true);
        webSocket.setPingInterval(25 * 1000);

        webSocket.addListener(new WebSocketAdapter() {
            @Override
            public void onTextMessage(WebSocket websocket, String message) throws Exception {
                Log.d("Websocket", "RECEIVE URL:" + url + " __ " + message);
                JSONArray jsonArray = new JSONArray(message);
                String messageType = jsonArray.get(0).toString();
                if (messageType.equals("EVENT")) {
                    JSONObject data = jsonArray.getJSONObject(2);
                    database.saveEvent(data, userPubKey, url);
                    reactNativeEvent(data.getString("id"));
                } else if (messageType.equals("OK")) {
                    reactNativeConfirmation(jsonArray.get(1).toString());
                }
            }
            @Override
            public void onDisconnected(WebSocket ws, WebSocketFrame serverCloseFrame,
                                       WebSocketFrame clientCloseFrame, boolean closedByServer) {
                ws.connectAsynchronously();
            }

            @Override
            public void onConnected(WebSocket websocket, Map<String, List<String>> headers) throws Exception
            {
                Log.d("Websocket", "CONNECTED URL:" + url);
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

    public void reactNativeConfirmation(String eventId) {
        Log.d("Websocket", "reactNativeConfirmation" + eventId);
        WritableMap payload = Arguments.createMap();
        payload.putString("eventId", eventId);
        context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("WebsocketConfirmation", payload);
    }
}
