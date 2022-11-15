package com.nostros.classes;

import android.util.Log;

import com.neovisionaries.ws.client.HostnameUnverifiedException;
import com.neovisionaries.ws.client.OpeningHandshakeException;
import com.neovisionaries.ws.client.WebSocket;
import com.neovisionaries.ws.client.WebSocketAdapter;
import com.neovisionaries.ws.client.WebSocketException;
import com.neovisionaries.ws.client.WebSocketFactory;
import com.nostros.modules.DatabaseModule;

import org.json.JSONArray;

import java.io.IOException;

public class Websocket {
    private WebSocket webSocket;
    private DatabaseModule database;
    private String url;

    public Websocket(String serverUrl, DatabaseModule databaseModule) {
        database = databaseModule;
        url = serverUrl;
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
        webSocket.addListener(new WebSocketAdapter() {
            @Override
            public void onTextMessage(WebSocket websocket, String message) throws Exception {
                Log.d("Websocket", "RECEIVE URL:" + url + " __ " + message);
                JSONArray jsonArray = new JSONArray(message);
                if (jsonArray.get(0).toString().equals("EVENT")) {
                    database.saveEvent(jsonArray.getJSONObject(2), userPubKey);
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
