# BloodPressure Android App – Build & Signing Dokumentation

Dieses Android-Projekt basiert auf **Capacitor 8**, **Android Gradle Plugin 8.2+** und dem **React/TypeScript Frontend** von BloodPressure.

## 1. Projektstruktur & Konfiguration

- **App Name**: `BloodPressure`
- **Application ID / Package**: `app.bloodpressure.mobile`
- **Capacitor Plugins**:
  - `@capacitor/camera`: Kamera-Erfassung und Foto-Upload
  - `@capacitor/filesystem`: Lokaler Dokumentenzugriff für PDF- und CSV-Exporte
  - `@capacitor/share`: Natives Android Teilen-Menü für Arztberichte und Tabellen

---

## 2. Lokaler Build in Android Studio

1. **Voraussetzungen**:
   - Android Studio (aktuell: Jellyfish / Koala oder neuer)
   - Android SDK API 34+
   - Java Development Kit (JDK 17 oder 21)

2. **Web-Assets synchronisieren**:
   ```bash
   npm run build
   npx cap sync android
   ```

3. **In Android Studio öffnen**:
   ```bash
   npx cap open android
   # oder Android Studio starten und den Ordner ./android öffnen
   ```

4. **Direkt auf Gerät / Emulator starten**:
   - In Android Studio das gewünschte Android-Gerät oder den AVD-Emulator wählen.
   - Auf das grüne **Run**-Symbol (▶) klicken.

---

## 3. Debug-APK über die Kommandozeile bauen

Im Terminal im Stammverzeichnis ausführen:
```bash
cd android
./gradlew assembleDebug
```
Nach erfolgreichem Build liegt die installierbare APK-Datei hier bereit:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Installation auf einem per USB verbundenen Smartphone mit aktiviertem USB-Debugging:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Release-Build & Signierung für Google Play Store

### A. Keystore generieren (einmalig)
```bash
keytool -genkey -v -keystore release-key.jks -alias bloodpressure -keyalg RSA -keysize 2048 -validity 10000
```
> **WICHTIGER SICHERHEITSHINWEIS**: Die `.jks`-Datei und Passwörter dürfen niemals in Git-Repositories eingecheckt werden. Sie verbleiben sicher auf dem lokalen Entwicklungsrechner oder in CI/CD Secrets (z. B. GitHub Actions Secrets).

### B. Signierung in `android/app/build.gradle` konfigurieren
Um sensible Daten zu schützen, können Umgebungsvariablen verwendet werden:
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "release-key.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS") ?: "bloodpressure"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### C. Release-APK oder Android App Bundle (AAB) erzeugen
- **Release-APK**:
  ```bash
  cd android
  ./gradlew assembleRelease
  ```
  Ausgabe: `android/app/build/outputs/apk/release/app-release.apk`

- **Google Play App Bundle (.aab)**:
  ```bash
  cd android
  ./gradlew bundleRelease
  ```
  Ausgabe: `android/app/build/outputs/bundle/release/app-release.aab`
