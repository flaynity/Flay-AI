package com.xflay.ai;

import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import com.google.firebase.FirebaseApp;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;

public class MainActivity extends Activity {

    private static final String APP_CONFIG_DB_PATH = "appConfig";
    private static final String OFFLINE_URL = "file:///android_asset/offline.html";
    private static final String PREF_NAME = "FlaynityAppPref";
    private static final String KEY_CACHED_URL = "cached_website_url";
    private static final String KEY_CACHED_SECRET = "cached_secret_key";
    private static final String KEY_NOTIFICATION_REQUESTED = "notification_permission_requested";

    private String websiteUrl = null; 
    private String secretKey = null;
    private String baseUserAgent = null;

    private static final int RC_SIGN_IN = 9001;
    private GoogleSignInClient mGoogleSignInClient;
    private static final String WEB_CLIENT_ID = "745781159590-e7olpsn0moluuttp1rlcdlluf3mdvuon.apps.googleusercontent.com";

    private WebView webview1;
    private boolean isError = false; 
    
    private PermissionRequest pendingPermissionRequest;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 1;
    private String currentFcmToken = "";

    private Handler handler = new Handler(Looper.getMainLooper());
    private boolean hasWebBackStack = false;

    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }
        
        @JavascriptInterface
        public String getFcmToken() {
            return currentFcmToken;
        }

        @JavascriptInterface
        public void setBackStackStatus(boolean hasHistory) {
            hasWebBackStack = hasHistory;
        }

        @JavascriptInterface
        public void triggerGoogleSignIn() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (mGoogleSignInClient != null) {
                        mGoogleSignInClient.signOut(); 
                        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
                        startActivityForResult(signInIntent, RC_SIGN_IN); 
                    }
                }
            });
        }

        @JavascriptInterface
        public void showRewardedVideoAd() {
            runOnUiThread(() -> {
                if (webview1 != null) {
                    webview1.evaluateJavascript("javascript:onAdRewardEarned();", null);
                }
            });
        }

        @JavascriptInterface
        public void showDownloadRewardedAd() {
            runOnUiThread(() -> {
                if (webview1 != null) {
                    webview1.evaluateJavascript("javascript:onDownloadAdRewardEarned();", null);
                }
            });
        }

        @JavascriptInterface
        public void retryConnection() {
            runOnUiThread(() -> MainActivity.this.retryConnection());
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(() -> MainActivity.this.requestNotificationPermission());
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        
        // 🔴 ভিপিএন/প্রক্সি ডিটেকশন (ক্লিন এক্সিট)
        if (isVpnOrProxyActive()) {
            Toast.makeText(this, "Security Alert: VPN or Proxy detected! Please disable it.", Toast.LENGTH_LONG).show();
            finishAffinity();
            return;
        }

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        setContentView(R.layout.main);
        webview1 = findViewById(R.id.webview1);

        setupFullScreen(); 

        try {
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(WEB_CLIENT_ID) 
                .requestEmail()
                .build();
            mGoogleSignInClient = GoogleSignIn.getClient(this, gso); 
        } catch (Exception e) {
            android.util.Log.e("GOOGLE_AUTH_INIT", "Initialization failed: " + e.getMessage());
        }
        
        setupWebView();
        startLoadingApp();
        fetchFcmToken();
        registerNetworkCallback();
    }

    private boolean isVpnOrProxyActive() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network activeNetwork = cm.getActiveNetwork();
                NetworkCapabilities caps = cm.getNetworkCapabilities(activeNetwork);
                if (caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                    return true;
                }
            }
            String proxyHost = System.getProperty("http.proxyHost");
            if (proxyHost != null && !proxyHost.trim().isEmpty()) {
                return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            setupFullScreen();
        }
    }

    private void setupFullScreen() {
        Window window = getWindow();
        if (window == null) return; 
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false); 
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            int uiOptions = View.SYSTEM_UI_FLAG_LAYOUT_STABLE 
                          | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                          | View.SYSTEM_UI_FLAG_FULLSCREEN 
                          | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
            window.getDecorView().setSystemUiVisibility(uiOptions);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.getAttributes().layoutInDisplayCutoutMode = 
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        int currentNightMode = newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        String themeMode = "light";
        if (currentNightMode == Configuration.UI_MODE_NIGHT_YES) {
            themeMode = "dark";
        }
        final String finalTheme = themeMode;
        runOnUiThread(() -> {
            if (webview1 != null) {
                webview1.evaluateJavascript("if(typeof window.selectThemeVal === 'function'){ window.selectThemeVal('" + finalTheme + "'); }", null);
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data); 
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null) {
                    String idToken = account.getIdToken(); 
                    if (webview1 != null) {
                        webview1.evaluateJavascript("javascript:handleNativeGoogleSignIn('" + idToken + "');", null);
                    }
                }
            } catch (ApiException e) {
                android.util.Log.e("GOOGLE_AUTH_FAILED", "Code: " + e.getStatusCode());
                final int errorCode = e.getStatusCode();
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Google Error Code: " + errorCode, Toast.LENGTH_LONG).show());
                if (webview1 != null) {
                    webview1.evaluateJavascript("javascript:showNotification('Google Sign-In Failed', 'error');", null);
                }
            }
        } 
        else if (requestCode == FILECHOOSER_RESULTCODE) {
            if (uploadMessage == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK) {
                if (data != null) {
                    String dataString = data.getDataString();
                    ClipData clipData = data.getClipData();
                    if (clipData != null) {
                        results = new Uri[clipData.getItemCount()];
                        for (int i = 0; i < clipData.getItemCount(); i++) {
                            ClipData.Item item = clipData.getItemAt(i);
                            results[i] = item.getUri();
                        }
                    }
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
            }
            uploadMessage.onReceiveValue(results);
            uploadMessage = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    private String getDynamicFirebaseDbUrl() {
        try {
            FirebaseApp app = FirebaseApp.getInstance();
            if (app != null && app.getOptions() != null) {
                String url = app.getOptions().getDatabaseUrl();
                if (url != null && !url.trim().isEmpty()) return url.trim();

                String projId = app.getOptions().getProjectId();
                if (projId != null && !projId.trim().isEmpty()) {
                    return "https://" + projId + "-default-rtdb.firebaseio.com";
                }
            }
        } catch (Exception ignored) {}

        try {
            int resId = getResources().getIdentifier("firebase_database_url", "string", getPackageName());
            if (resId != 0) {
                String url = getString(resId);
                if (url != null && !url.trim().isEmpty()) return url.trim();
            }
        } catch (Exception ignored) {}

        return null;
    }

    private void applySecretKeyToUserAgent(String key) {
        if (key == null || key.trim().isEmpty() || webview1 == null) return;
        runOnUiThread(() -> {
            WebSettings ws = webview1.getSettings();
            if (baseUserAgent == null) {
                baseUserAgent = ws.getUserAgentString();
            }
            String targetKey = key.trim();
            if (!ws.getUserAgentString().contains(targetKey)) {
                ws.setUserAgentString(baseUserAgent + " " + targetKey);
            }
        });
    }

    private void startLoadingApp() {
        isError = false;

        SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String cachedUrl = prefs.getString(KEY_CACHED_URL, null);
        String cachedSecret = prefs.getString(KEY_CACHED_SECRET, null);

        if (cachedSecret != null && !cachedSecret.trim().isEmpty()) {
            secretKey = cachedSecret.trim();
            applySecretKeyToUserAgent(secretKey);
        }

        if (cachedUrl != null && !cachedUrl.trim().isEmpty()) {
            websiteUrl = cachedUrl.trim();
        }

        if (!isNetworkAvailable()) {
            if (websiteUrl != null && !websiteUrl.trim().isEmpty()) {
                loadWebsiteUrl();
            } else if (webview1 != null) {
                webview1.loadUrl(OFFLINE_URL);
            }
            return;
        }

        if (websiteUrl != null && !websiteUrl.trim().isEmpty()) {
            loadWebsiteUrl();
        }

        handler.postDelayed(() -> {
            if (websiteUrl == null && !isFinishing() && webview1 != null) {
                webview1.loadUrl(OFFLINE_URL);
            }
        }, 6000);

        fetchConfigDirectFromFirebase();

        try {
            String dbUrl = getDynamicFirebaseDbUrl();
            DatabaseReference configRef;
            if (dbUrl != null) {
                configRef = FirebaseDatabase.getInstance(dbUrl).getReference(APP_CONFIG_DB_PATH);
            } else {
                configRef = FirebaseDatabase.getInstance().getReference(APP_CONFIG_DB_PATH);
            }

            configRef.addListenerForSingleValueEvent(new ValueEventListener() {
                @Override
                public void onDataChange(DataSnapshot snapshot) {
                    String remoteUrl = snapshot.child("websiteUrl").getValue(String.class);
                    String remoteSecret = snapshot.child("secretKey").getValue(String.class);

                    saveAndApplyConfig(remoteUrl, remoteSecret);
                }

                @Override
                public void onCancelled(DatabaseError error) {
                    android.util.Log.e("FIREBASE_CONFIG", "Failed: " + error.getMessage());
                }
            });
        } catch (Exception e) {
            android.util.Log.e("FIREBASE_CONFIG", "SDK Init failed: " + e.getMessage());
        }
    }

    private void saveAndApplyConfig(final String url, final String secret) {
        runOnUiThread(() -> {
            SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            boolean secretUpdated = false;
            if (secret != null && !secret.trim().isEmpty()) {
                secretKey = secret.trim();
                editor.putString(KEY_CACHED_SECRET, secretKey);
                applySecretKeyToUserAgent(secretKey);
                secretUpdated = true;
            }

            if (url != null && !url.trim().isEmpty()) {
                String cleanUrl = url.trim();
                if (cleanUrl.startsWith("https://") || cleanUrl.startsWith("http://")) {
                    boolean urlChanged = (websiteUrl == null || !websiteUrl.equals(cleanUrl));
                    websiteUrl = cleanUrl;
                    editor.putString(KEY_CACHED_URL, websiteUrl);

                    if (urlChanged || secretUpdated) {
                        loadWebsiteUrl();
                    }
                }
            }
            editor.apply();
        });
    }

    private void fetchConfigDirectFromFirebase() {
        new Thread(() -> {
            HttpURLConnection conn = null;
            BufferedReader reader = null;
            try {
                String dynamicDbUrl = getDynamicFirebaseDbUrl();
                if (dynamicDbUrl == null || dynamicDbUrl.trim().isEmpty()) return;

                if (dynamicDbUrl.endsWith("/")) {
                    dynamicDbUrl = dynamicDbUrl.substring(0, dynamicDbUrl.length() - 1);
                }

                URL url = new URL(dynamicDbUrl + "/" + APP_CONFIG_DB_PATH + ".json");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                if (conn.getResponseCode() == 200) {
                    reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }

                    JSONObject json = new JSONObject(sb.toString().trim());
                    String remoteUrl = json.optString("websiteUrl", null);
                    String remoteSecret = json.optString("secretKey", null);

                    saveAndApplyConfig(remoteUrl, remoteSecret);
                }
            } catch (Exception e) {
                android.util.Log.e("FIREBASE_FETCH", "Error: " + e.getMessage());
            } finally {
                if (reader != null) {
                    try { reader.close(); } catch (Exception ignored) {}
                }
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }).start();
    }

    private void loadWebsiteUrl() {
        if (webview1 == null) return;

        if (websiteUrl == null || websiteUrl.trim().isEmpty()) {
            webview1.loadUrl(OFFLINE_URL);
            return;
        }

        if (isNetworkAvailable()) {
            webview1.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
            webview1.loadUrl(websiteUrl);
        } else {
            webview1.getSettings().setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
            webview1.loadUrl(websiteUrl);
        }
    }

    private void retryConnection() {
        if (isVpnOrProxyActive()) {
            Toast.makeText(this, "Security Alert: VPN or Proxy detected!", Toast.LENGTH_LONG).show();
            return;
        }

        if (!isNetworkAvailable()) {
            runOnUiThread(() -> {
                Toast.makeText(MainActivity.this, "Still No Internet Connection 😕", Toast.LENGTH_SHORT).show();
                if (webview1 != null) {
                    webview1.evaluateJavascript("if(typeof window.stopRefreshAnimation === 'function'){ window.stopRefreshAnimation(); }", null);
                }
            });
            return; 
        }

        runOnUiThread(() -> {
            isError = false;

            if (websiteUrl == null || websiteUrl.trim().isEmpty()) {
                SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
                websiteUrl = prefs.getString(KEY_CACHED_URL, null);
                secretKey = prefs.getString(KEY_CACHED_SECRET, null);
                if (secretKey != null) applySecretKeyToUserAgent(secretKey);
            }

            if (webview1 != null) {
                webview1.evaluateJavascript("if(typeof window.stopRefreshAnimation === 'function'){ window.stopRefreshAnimation(); }", null);
            }

            if (websiteUrl != null && !websiteUrl.trim().isEmpty()) {
                loadWebsiteUrl();
            } else {
                startLoadingApp();
            }
        });
    }

    private void setupWebView() {
        if (webview1 == null) return;
        WebSettings ws = webview1.getSettings();
        
        String defaultUA = ws.getUserAgentString();
        if (defaultUA != null) {
            baseUserAgent = defaultUA.replaceAll("(?i);\\s*wv", "")
                                     .replaceAll("(?i)Version/\\d+\\.\\d+\\s*", "");
            ws.setUserAgentString(baseUserAgent); 
        }
        
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webview1, true);
        }

        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setGeolocationEnabled(true);
        ws.setAllowContentAccess(true);
        ws.setAllowFileAccessFromFileURLs(true);
        ws.setAllowUniversalAccessFromFileURLs(true);
        
        ws.setSupportMultipleWindows(false);
        ws.setJavaScriptCanOpenWindowsAutomatically(false);
        
        ws.setSupportZoom(false);
        ws.setBuiltInZoomControls(false);
        ws.setDisplayZoomControls(false);
        ws.setLoadWithOverviewMode(true);
        ws.setUseWideViewPort(true);
        ws.setMediaPlaybackRequiresUserGesture(false); 
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webview1.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_BOUND, true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            ws.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        webview1.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        ws.setLoadsImagesAutomatically(true);
        
        webview1.setVerticalScrollBarEnabled(false);
        webview1.setHorizontalScrollBarEnabled(false);
        webview1.setScrollBarStyle(View.SCROLLBARS_OUTSIDE_OVERLAY);

        webview1.addJavascriptInterface(new WebAppInterface(this), "AndroidBridge");

        webview1.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView v, String url, Bitmap fav) {
                super.onPageStarted(v, url, fav);
                isError = false; 
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                super.onPageFinished(v, url);
                if (!isError && !url.equals("about:blank") && !url.equals(OFFLINE_URL)) {
                    v.evaluateJavascript("if (typeof syncFcmToken === 'function') { syncFcmToken(); }", null);
                }
            }

            @Override
            public void onReceivedError(WebView v, int code, String desc, String url) {
                super.onReceivedError(v, code, desc, url);
                if (url != null && ((websiteUrl != null && url.startsWith(websiteUrl)) || url.equals("about:blank"))) {
                    isError = true;
                    if (webview1 != null) webview1.loadUrl(OFFLINE_URL);
                }
            }

            @TargetApi(Build.VERSION_CODES.M)
            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                super.onReceivedError(v, r, e);
                if (r.isForMainFrame()) {
                    isError = true;
                    if (webview1 != null) webview1.loadUrl(OFFLINE_URL);
                }
            }

            @Override
            public void onReceivedSslError(WebView v, SslErrorHandler h, SslError e) { 
                h.cancel();
                isError = true;
                v.loadUrl(OFFLINE_URL);
            }
            
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return handleUrlRouting(url);
            }

            @TargetApi(Build.VERSION_CODES.N)
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                return handleUrlRouting(request.getUrl().toString());
            }
        });

        webview1.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView v, String url, String msg, JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(msg)
                    .setPositiveButton("OK", (d, w) -> r.confirm()).setCancelable(false).show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView v, String url, String msg, JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(msg)
                    .setPositiveButton("Yes", (d, w) -> r.confirm())
                    .setNegativeButton("No",  (d, w) -> r.cancel()).setCancelable(false).show();
                return true;
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String o, GeolocationPermissions.Callback c) {
                c.invoke(o, true, false);
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    ArrayList<String> missingPermissions = new ArrayList<>();
                    for (String resource : request.getResources()) {
                        if (resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                                MainActivity.this.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_DENIED) {
                                missingPermissions.add(android.Manifest.permission.RECORD_AUDIO);
                            }
                        }
                        if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                                MainActivity.this.checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_DENIED) {
                                missingPermissions.add(android.Manifest.permission.CAMERA);
                            }
                        }
                    }
                    if (!missingPermissions.isEmpty()) {
                        pendingPermissionRequest = request;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            MainActivity.this.requestPermissions(missingPermissions.toArray(new String[0]), 102);
                        }
                    } else {
                        request.grant(request.getResources());
                    }
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, WebChromeClient.FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                    uploadMessage = null;
                }
                uploadMessage = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILECHOOSER_RESULTCODE);
                } catch (ActivityNotFoundException e) {
                    uploadMessage = null;
                    Toast.makeText(MainActivity.this, "Cannot open file chooser", Toast.LENGTH_LONG).show();
                    return false;
                }
                return true;
            }
        });
    }

    private boolean handleUrlRouting(String url) {
        if (url == null) return false;

        if (url.startsWith("intent:") || url.contains("t.me") || url.contains("telegram.me") || url.startsWith("whatsapp:") || url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("market:")) {
            try {
                Intent intent;
                if (url.startsWith("intent:")) {
                    intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                } else {
                    intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                }

                if (intent != null) {
                    if (getPackageManager().resolveActivity(intent, 0) != null) {
                        startActivity(intent);
                    }
                    return true;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return true;
        }

        return false; 
    }

    private void fetchFcmToken() {
        try {
            com.google.firebase.iid.FirebaseInstanceId.getInstance().getInstanceId()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null) {
                        currentFcmToken = task.getResult().getToken();
                        try {
                            com.google.firebase.messaging.FirebaseMessaging.getInstance().subscribeToTopic("all");
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                });
        } catch (Exception e) {
            try {
                currentFcmToken = com.google.firebase.iid.FirebaseInstanceId.getInstance().getToken();
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    private void registerNetworkCallback() {
        try {
            ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && connectivityManager != null) {
                connectivityManager.registerDefaultNetworkCallback(new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        runOnUiThread(() -> {
                            String currentUrl = (webview1 != null) ? webview1.getUrl() : "";
                            if (isError || (currentUrl != null && currentUrl.equals(OFFLINE_URL))) {
                                retryConnection();
                            }
                        });
                    }

                    @Override
                    public void onLost(Network network) {
                        runOnUiThread(() -> {});
                    }
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void checkAndRequestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            ArrayList<String> permissions = new ArrayList<>();
            
            if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_DENIED) {
                permissions.add(android.Manifest.permission.RECORD_AUDIO);
            }

            if (Build.VERSION.SDK_INT >= 33) { 
                if (checkSelfPermission("android.permission.READ_MEDIA_IMAGES") == android.content.pm.PackageManager.PERMISSION_DENIED) {
                    permissions.add("android.permission.READ_MEDIA_IMAGES");
                }
                if (checkSelfPermission("android.permission.READ_MEDIA_VIDEO") == android.content.pm.PackageManager.PERMISSION_DENIED) {
                    permissions.add("android.permission.READ_MEDIA_VIDEO");
                }
                if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") == android.content.pm.PackageManager.PERMISSION_DENIED) {
                    permissions.add("android.permission.POST_NOTIFICATIONS");
                }
            } else {
                if (checkSelfPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_DENIED) {
                    permissions.add(android.Manifest.permission.READ_EXTERNAL_STORAGE);
                }
                if (checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_DENIED) {
                    permissions.add(android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
                }
            }
            
            if (!permissions.isEmpty()) {
                requestPermissions(permissions.toArray(new String[0]), 101);
            }
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < 33) return;

        SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        if (prefs.getBoolean(KEY_NOTIFICATION_REQUESTED, false)) return;

        if (checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            prefs.edit().putBoolean(KEY_NOTIFICATION_REQUESTED, true).apply();
            return;
        }

        prefs.edit().putBoolean(KEY_NOTIFICATION_REQUESTED, true).apply();
        requestPermissions(
            new String[]{"android.permission.POST_NOTIFICATIONS"},
            103
        );
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == 102 && pendingPermissionRequest != null) {
            PermissionRequest request = pendingPermissionRequest;
            pendingPermissionRequest = null;

            boolean cameraGranted = true;
            boolean audioGranted = true;

            for (int i = 0; i < permissions.length; i++) {
                if (android.Manifest.permission.CAMERA.equals(permissions[i])) {
                    cameraGranted = grantResults[i] == android.content.pm.PackageManager.PERMISSION_GRANTED;
                } else if (android.Manifest.permission.RECORD_AUDIO.equals(permissions[i])) {
                    audioGranted = grantResults[i] == android.content.pm.PackageManager.PERMISSION_GRANTED;
                }
            }

            if (cameraGranted && audioGranted) {
                try {
                    request.grant(request.getResources());
                } catch (Exception e) {
                    android.util.Log.e("WEBVIEW_PERMISSION", "Grant failed: " + e.getMessage());
                }
            } else {
                try {
                    request.deny();
                } catch (Exception ignored) {}
            }
            return;
        }

        if (requestCode == 103) {
            // Notification permission is requested only after the Home page is reached.
            return;
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm != null) {
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnected();
        }
        return false;
    }

    @Override
    public void onBackPressed() {
        if (webview1 == null) {
            super.onBackPressed();
            return;
        }

        String currentUrl = webview1.getUrl();
        if (currentUrl != null && currentUrl.equals(OFFLINE_URL)) {
            finish();
            return;
        }

        if (webview1.canGoBack()) {
            webview1.goBack();
            return;
        }

        webview1.evaluateJavascript(
            "(function(){"
            + "try {"
            + "if (window.app && typeof window.app.executeBackAction === 'function') {"
            + "window.app.executeBackAction(); return 'handled';"
            + "}"
            + "if (typeof window.executeBackAction === 'function') {"
            + "window.executeBackAction(); return 'handled';"
            + "}"
            + "} catch(e) {"
            + "console.error('Back navigation error:', e);"
            + "}"
            + "return 'not_handled';"
            + "})()",
            value -> {
                if (value == null || value.contains("not_handled")) {
                    finish();
                }
            }
        );
    }

    @Override 
    protected void onResume() { 
        super.onResume();  
        if (webview1 != null) webview1.onResume();  
    }

    @Override 
    protected void onPause() { 
        super.onPause();   
        if (webview1 != null) webview1.onPause();   
    }

    @Override 
    protected void onDestroy() {
        super.onDestroy();
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }
        if (webview1 != null) {
            webview1.destroy();
        }
    }
}
