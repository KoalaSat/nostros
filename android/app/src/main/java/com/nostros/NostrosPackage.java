package com.nostros;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.nostros.classes.Database;
import com.nostros.modules.DatabaseModule;
import com.nostros.modules.RelayPoolModule;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class NostrosPackage implements ReactPackage {
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(
            ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();

        Database database = new Database(reactContext.getFilesDir().getAbsolutePath());
        modules.add(new DatabaseModule(reactContext, database));
        modules.add(new RelayPoolModule(reactContext, database));

        return modules;
    }
}
