package com.nostros.modules;

import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.neovisionaries.ws.client.HostnameUnverifiedException;
import com.neovisionaries.ws.client.OpeningHandshakeException;
import com.neovisionaries.ws.client.WebSocket;
import com.neovisionaries.ws.client.WebSocketAdapter;
import com.neovisionaries.ws.client.WebSocketException;
import com.neovisionaries.ws.client.WebSocketFactory;

import org.json.JSONArray;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public class WebsocketModule extends ReactContextBaseJavaModule {
    private WebSocket webSocket;
    private DatabaseModule database;

    public WebsocketModule(ReactApplicationContext reactContext) {
        super(reactContext);
        database = new DatabaseModule(reactContext);
    }

    @Override
    public String getName() {
        return "WebsocketModule";
    }

    @ReactMethod
    public void send(String message) {
        webSocket.sendText(message);

    }

    @ReactMethod
    public void connectWebsocket(Callback callBack) throws IOException {
        WebSocketFactory factory = new WebSocketFactory();
        webSocket = factory.createSocket("wss://relay.damus.io");
        webSocket.addListener(new WebSocketAdapter() {
            @Override
            public void onConnected(WebSocket ws, Map<String, List<String>> headers) throws Exception
            {
                callBack.invoke("connected");
            }

            @Override
            public void onTextMessage(WebSocket websocket, String message) throws Exception {
                JSONArray jsonArray = new JSONArray(message);
                if (jsonArray.get(0).toString().equals("EVENT")) {
                    Log.d("JSON Event", jsonArray.get(0).toString());
                    database.saveEvent(jsonArray.getJSONObject(2));
                }
            }
        });
        try {
            webSocket.connect();
        }catch (OpeningHandshakeException e)
        {
            // A violation against the WebSocket protocol was detected
            // during the opening handshake.
            Log.d("WebSocket", "A violation against the WebSocket protocol was detected.");
        }
        catch (HostnameUnverifiedException e)
        {
            // The certificate of the peer does not match the expected hostname.
            Log.d("WebSocket", "The certificate of the peer does not match the expected hostname.");
        }
        catch (WebSocketException e)
        {
            Log.d("WebSocket", "Failed to establish a WebSocket connection.");
        }
    }
}
