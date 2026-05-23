# Thola Mobile App: Runtime Security & Anti-Tampering (freeRASP)

This document explains the **freeRASP (Runtime Application Self-Protection)** security layer integrated into the Thola Mobile App. It is designed to be understood by both business stakeholders (non-technical) and developers (technical).

---

## 👔 Non-Technical Perspective (For Business & Stakeholders)

### What is it?
freeRASP is like an **invisible, 24/7 security guard** that lives entirely inside the Thola mobile app. Once a user downloads the app, this guard actively watches the user's phone environment and blocks malicious users from trying to hack, steal from, or cheat the platform.

### Why do we need it?
Hackers often try to break into mobile apps to:
1. Steal sensitive customer data or vendor information.
2. Bypass security walls (like KYC checks or payments).
3. Clone the app to create fake, malicious versions of Thola to trick users.

### How does it protect Thola?
If a user tries to open the Thola app, the security guard instantly checks their phone:
- **"Is this a real phone?"** If it detects a fake phone (an emulator on a hacker's PC), it raises an alarm.
- **"Is the phone safe?"** If the phone has been "Rooted" or "Jailbroken" (meaning its built-in Android/Apple security walls have been destroyed), the app will refuse to load sensitive data.
- **"Has the app been modified?"** If a hacker downloads the Thola app, modifies the code, and tries to run their custom "hacked" version, freeRASP instantly recognizes that the app's digital fingerprint is wrong and forces it to close.

**The Result:** The moment any threat is detected, the app instantly **logs the user out** and throws a security alert to protect the platform.

---

## 💻 Technical Perspective (For Developers & Security Teams)

### Architecture Overview
The Thola Mobile App uses `freerasp-react-native` by Talsec. This is a robust SDK that injects natively compiled C++ security libraries into the Android (`.apk`/`.aab`) and iOS (`.ipa`) binaries during the Expo EAS build process. 

Because it is compiled directly into the native layer (JNI for Android, Objective-C/Swift for iOS), it is incredibly difficult for reverse engineers to simply "comment out" the security checks in the JavaScript bundle.

### Active Threat Vectors Monitored

1. **App Integrity & Repackaging (Signature Verification)**
   - **How it works:** During the EAS build, we generate a cryptographic SHA-256 fingerprint of the Keystore used to sign the APK. This fingerprint is Base64 encoded (`oMCacpG4z8Tk...`) and hardcoded into the freeRASP configuration.
   - **Detection:** At runtime, the native C++ library hashes the active APK signature. If an attacker modifies the `.dex` files or JavaScript bundle and repackages the APK, they must sign it with their own key. The hashes will mismatch, triggering the `appIntegrity` callback.

2. **Root & Jailbreak Detection (Privileged Access)**
   - **How it works:** Scans for known root binaries (`su`), Magisk, SuperSU, and altered system partitions. It checks if the OS sandbox has been compromised.
   - **Detection:** Triggers the `privilegedAccess` callback, preventing execution on severely compromised OS environments.

3. **Dynamic Instrumentation (Hooking)**
   - **How it works:** Scans memory space and process maps for known hooking frameworks (Frida, Xposed, Cydia Substrate). 
   - **Detection:** If a hacker attempts to hook into the runtime memory to intercept API keys or alter state variables on the fly, it triggers the `hooks` callback.

4. **Debugger Attachment**
   - **How it works:** Checks the Android `Debug.isDebuggerConnected()` flag and low-level ptrace statuses to see if a reverse-engineering debugger (like GDB or LLDB) is attached to the process.
   - **Detection:** Triggers the `debug` callback.

### Implementation Details
The security callbacks are initialized in `frontend/src/app/_layout.tsx` on app startup. 

Currently, Thola employs a **Moderate Security Response Model**. When a critical callback fires (e.g., `appIntegrity` or `privilegedAccess`), the app executes:
```javascript
Alert.alert('Security Alert', 'Rooted/Jailbroken device detected. Logging out to protect your data.', [
    { text: 'OK', onPress: () => logout() }
]);
```
This forces the Zustand state manager to instantly purge the user's Supabase session tokens from secure storage, rendering the compromised environment useless for API attacks.

### Telemetry
The SDK is configured with the `watcherMail: 'thabisomashifana2@gmail.com'`. Talsec's backend automatically collects anonymized threat events from the field. Weekly telemetry reports are emailed to the administrator, providing a dashboard-like overview of how many users attempted to attack or modify the app.
