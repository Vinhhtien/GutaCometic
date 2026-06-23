import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
};

const defaultGoogleWebClientId =
  "550502262089-4ehta6ckc0daipi9i32g5kinsd7jfi8g.apps.googleusercontent.com";
const expoProjectFullName = "@vinhhtien/guta-cosmetic-pos";
export const googleExpoRedirectUri = `https://auth.expo.io/${expoProjectFullName}`;

export async function getGoogleIdToken() {
  const clientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || defaultGoogleWebClientId;

  const returnUrl = AuthSession.getDefaultReturnUrl();
  const request = new AuthSession.AuthRequest({
    clientId,
    extraParams: {
      nonce: Crypto.randomUUID(),
      prompt: "select_account",
    },
    redirectUri: googleExpoRedirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    scopes: ["openid", "profile", "email"],
    usePKCE: false,
  });
  const authUrl = await request.makeAuthUrlAsync(discovery);
  const proxyStartUrl = `${googleExpoRedirectUri}/start?${new URLSearchParams({
    authUrl,
    returnUrl,
  }).toString()}`;
  const browserResult = await WebBrowser.openAuthSessionAsync(
    proxyStartUrl,
    returnUrl
  );

  if (browserResult.type !== "success") {
    throw new Error("Google Sign-In was cancelled.");
  }

  const result = request.parseReturnUrl(browserResult.url);

  if (result.type !== "success" || !result.params.id_token) {
    throw new Error("Google did not return an ID token.");
  }

  return result.params.id_token;
}
