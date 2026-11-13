# Notifications and entrance media

This branch adds client integration points and a server push worker. The inbox is durable database data; push delivery is an optional signal and cannot complete or roll back a delivery.

## Backend requirements

Merge the Supabase backend prerequisite before deploying these functions. It owns the `entrance-photos` private bucket, participant Storage policies, `device_push_tokens`, inbox, and leased outbox RPCs.

The push worker calls service-role-only `notification_claim_batch(p_limit)` and `notification_record_result(...)`. A claim has a lease; acknowledgements include the lease ID so stale workers cannot overwrite newer results. Sending and receipt polling are bounded to eight attempts with exponential backoff. Invalid Expo tokens are removed by the backend. The worker sends a fixed generic body with only delivery and notification identifiers in `data`; no addresses or verification codes.

An Expo success receipt means the provider accepted the request, not that a person saw the alert. External push transport is at least once: a process crash after sending but before saving the Expo ticket may cause a duplicate alert. The durable inbox/outbox key deduplicates application events and the client deduplicates taps. Do not claim exactly-once delivery to a device.

## Worker configuration

Set backend-only `PUSH_WORKER_SECRET` (at least 32 random characters), `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Set `EXPO_ACCESS_TOKEN` if Expo enhanced push security is enabled. Never expose these values in `EXPO_PUBLIC_*` variables.

Deploy `push-worker` with the function gateway's JWT verification disabled because this endpoint authenticates the separate worker secret itself. Invoke only from an authorized scheduler/service with `Authorization: Bearer <PUSH_WORKER_SECRET>`. No secret belongs in a mobile client. Poll periodically so pending Expo receipts are checked as well as new work. This repository does not provision the scheduler or deploy hosted resources.

## Device setup

Remote push requires a physical device, an Expo development build, an EAS project ID in app configuration, and platform push credentials. A browser or Expo Go is not evidence that remote push works. The native adapter checks prerequisites before requesting permission and creates the Android notification channel before token acquisition. Denied permission must leave inbox and delivery actions usable.

Token registration is available only in connected mode after authentication. The lifecycle serializes register/unregister operations so sign-out cleanup waits for an in-flight registration before removing it. A late permission result is discarded if the account changes. A new user registering the same token must atomically replace the backend's old association. Failed unlinking must be surfaced before sign-out rather than pretending the device was removed.

## Entrance photos and coordinates

The image picker requests library access for an optional photo. Typed instructions and manually entered coordinates remain available when photo permission is denied. Maps and live tracking are not required for this fallback; coordinate entry is not described as a live rider location.

Images are compressed by the picker and decoded to bytes for Supabase Storage's React Native upload path. JPEG, PNG, and WebP MIME constraints exist in the validator; the current picker path produces and validates JPEG bytes. The size limit is 5 MB. Objects are created at `<deliveryId>/<authenticatedUserId>/<random>.jpg` using `upsert: false`.

Uploading does not attach a photo by itself. The client first stages a new object, then issues an authorized delivery update. If attachment fails, cleanup removes only that newly staged object, best effort; the existing attached image is untouched. An orphan may remain if cleanup fails during network loss. Private Storage policies remain the authority for access. Signed URLs expire after 60 seconds and must not be persisted or reused across account changes.

## Verification

`npm run test:notifications` exercises stale-account registration, queued sign-out cleanup, denied permission, safe deep-link parsing and authorization, image/path/coordinate validation, staged-upload cleanup, ticket/receipt progression, bounded retries, and invalid tokens. Transport is injected in these tests; they do not send real pushes. Native permission, photo-picker, and push delivery behavior require the configured device checks above.
