package com.antigravity.logi;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentSender;
import android.os.Build;
import android.os.Bundle;

/** Puente transparente para devolver a Capacitor el resultado del consentimiento de Google. */
public class GoogleAuthorizationActivity extends Activity {
    private static final int REQUEST_AUTHORIZE = 7001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        PendingIntent pendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pendingIntent = getIntent().getParcelableExtra("authorization", PendingIntent.class);
        } else {
            @SuppressWarnings("deprecation")
            PendingIntent legacy = getIntent().getParcelableExtra("authorization");
            pendingIntent = legacy;
        }
        if (pendingIntent == null) {
            setResult(RESULT_CANCELED);
            finish();
            return;
        }
        try {
            startIntentSenderForResult(pendingIntent.getIntentSender(), REQUEST_AUTHORIZE, null, 0, 0, 0);
        } catch (IntentSender.SendIntentException error) {
            setResult(RESULT_CANCELED);
            finish();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_AUTHORIZE) return;
        setResult(resultCode, data);
        finish();
    }
}
