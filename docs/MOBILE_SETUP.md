# Mobile setup

Run `npm install` inside `mobile`, copy `.env.example` to `.env`, and set `EXPO_PUBLIC_API_URL` to the backend address reachable from the phone. Run `npx expo start`; scan the Expo Go QR code. Both devices must be on the same network. Open Windows Firewall port 8000 for local testing if necessary. The client uses SecureStore for tokens, ImagePicker for camera/gallery, and Sharing for PDF reports. Camera images are marked `smartphone` and are not eligible for inference. Confirm SDK compatibility with `npx expo doctor`.
