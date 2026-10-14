package com.antigravity.logi;

import android.app.Activity;
import android.content.Intent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.Scope;

import java.util.Arrays;
import java.util.List;

@CapacitorPlugin(name = "GoogleAuthorization")
public class GoogleAuthorizationPlugin extends Plugin {
    private static final List<Scope> DRIVE_SCOPES = Arrays.asList(
        new Scope("email"),
        new Scope("profile"),
        new Scope("https://www.googleapis.com/auth/drive.file")
    );

    private AuthorizationClient client() {
        return Identity.getAuthorizationClient(getActivity());
    }

    @PluginMethod
    public void authorize(PluginCall call) {
        AuthorizationRequest.Builder builder = AuthorizationRequest.builder().setRequestedScopes(DRIVE_SCOPES);
        if (call.getBoolean("selectAccount", false)) {
            builder.setPrompt(AuthorizationRequest.Prompt.SELECT_ACCOUNT);
        }
        client().authorize(builder.build())
            .addOnSuccessListener(result -> {
                if (result.hasResolution()) {
                    Intent bridgeIntent = new Intent(getContext(), GoogleAuthorizationActivity.class);
                    bridgeIntent.putExtra("authorization", result.getPendingIntent());
                    startActivityForResult(call, bridgeIntent, "authorizationResult");
                } else {
                    resolveAuthorization(call, result);
                }
            })
            .addOnFailureListener(error -> call.reject("No fue posible abrir la autorización de Google.", error));
    }

    @ActivityCallback
    private void authorizationResult(PluginCall call, ActivityResult activityResult) {
        if (activityResult.getResultCode() != Activity.RESULT_OK || activityResult.getData() == null) {
            call.reject("La conexión con Google fue cancelada.");
            return;
        }
        try {
            resolveAuthorization(call, client().getAuthorizationResultFromIntent(activityResult.getData()));
        } catch (Exception error) {
            call.reject("Google no devolvió una autorización válida.", error);
        }
    }

    @SuppressWarnings("deprecation")
    private void resolveAuthorization(PluginCall call, AuthorizationResult result) {
        String accessToken = result.getAccessToken();
        if (accessToken == null || accessToken.isEmpty()) {
            call.reject("Google no entregó un token de acceso para Drive.");
            return;
        }
        JSObject payload = new JSObject();
        payload.put("accessToken", accessToken);
        payload.put("grantedScopes", new JSArray(result.getGrantedScopes()));
        GoogleSignInAccount account = result.toGoogleSignInAccount();
        payload.put("email", account != null && account.getEmail() != null ? account.getEmail() : "");
        payload.put("displayName", account != null && account.getDisplayName() != null ? account.getDisplayName() : "");
        call.resolve(payload);
    }
}
