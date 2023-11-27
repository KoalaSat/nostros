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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Websocket {
    private WebSocket webSocket;
    private Database database;
    private String url;
    private String pubKey;
    private ReactApplicationContext context;
    private ArrayList<String> createdEvents;

    public Websocket(String serverUrl, Database databaseEntity, ReactApplicationContext reactContext, ArrayList<String> events) {
        database = databaseEntity;
        url = serverUrl;
        context = reactContext;
        createdEvents = events;
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
                JSONArray jsonArray = new JSONArray(message);
                String messageType = jsonArray.get(0).toString();
                if (messageType.equals("EVENT")) {
                    JSONObject data = jsonArray.getJSONObject(2);
                    String id = data.getString("id");
                    if (!createdEvents.contains(id)) {
                        Log.d("Websocket", "RECEIVE URL:" + url + " __NEW__ " + message);
                        int action = database.saveEvent(data, userPubKey, url);
                        if (action >= 2) {
                            reactNativeNotification(data.getString("id"), data.getString("kind"));
                        }
                        if (action >= 1) {
                            reactNativeEvent(data.getString("id"));
                        }
                        createdEvents.add(id);
                    } else {
                        Log.d("Websocket", "RECEIVE URL:" + url + " __DUP__ " + message);
                    }
                } else if (messageType.equals("OK")) {
                    Log.d("Websocket", "RECEIVE OK:" + url + message);
                    reactNativeConfirmation(jsonArray.get(1).toString());
                } else if (messageType.equals("AUTH")) {
                    Log.d("Websocket", "RECEIVE AUTH:" + url + message);
                    reactNativeAuth(jsonArray.get(1).toString());
                } else if (messageType.equals("PAY")) {
                    Log.d("Websocket", "RECEIVE PAY:" + url + message);
                    reactNativePay(jsonArray.get(1).toString(), jsonArray.get(2).toString(), jsonArray.get(3).toString());
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

    public void reactNativeNotification(String eventId, String kind) {
        Log.d("Websocket", "reactNativeNotification");
        WritableMap payload = Arguments.createMap();
        payload.putString("eventId", eventId);
        payload.putString("kind", kind);
        context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("WebsocketNotification", payload);
    }

    public void reactNativeAuth(String challenge) {
        Log.d("Websocket", "reactNativeNotification");
        WritableMap payload = Arguments.createMap();
        payload.putString("description", challenge);
        payload.putString("url", url);
        context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("WebsocketAuth", payload);
    }

    public void reactNativePay(String invoice, String description, String url) {
        Log.d("Websocket", "reactNativeNotification");
        WritableMap payload = Arguments.createMap();
        payload.putString("invoice", invoice);
        payload.putString("description", description);
        payload.putString("url", url);
        context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("WebsocketPay", payload);
    }
}
