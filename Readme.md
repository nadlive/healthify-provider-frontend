# Healthify Provider Frontend

### Allow insecure content in Chrome

The free AWS setup only serves the apps over HTTP. Chrome blocks camera, microphone, and other mixed content on these sites until insecure content is allowed.

1. Open the app URL in Chrome.
2. Click the Lock / Caution icon on the far left of the address bar.
3. Click **Site settings**.
4. Scroll down until you find **Insecure content**.
5. Set it to **Allow**, then reload the page.

Add firebase details to `firebase.js`

**Need to enable Firebase**
https://console.firebase.google.com/u/0/project/healthify-chat/authentication/providers
`Authentication -> Sign-in methods -> Anonymous`

\*\*Need to create db and give rules
https://console.firebase.google.com/u/0/project/healthify-chat/firestore/databases/-default-/security/rules

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null;
    }
  }
}
```
