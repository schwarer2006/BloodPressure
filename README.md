# BloodPressure
### Intelligenter Blutdruckmanager für Android und Web

**BloodPressure** ist eine deutschsprachige, offline-orientierte Anwendung zur Erfassung, Verwaltung, Visualisierung und Dokumentation persönlicher Blutdruckmessungen.

Die Anwendung kombiniert ein digitales Blutdrucktagebuch mit statistischen Auswertungen, interaktiven Diagrammen und einem druckfertigen PDF-Verlaufsbericht für ärztliche Konsultationen.

Entwickelt mit **React, TypeScript, Vite und Capacitor** auf Basis einer gemeinsamen Codebasis für Android und Progressive Web Apps (PWA).

**Aktueller Entwicklungsstand:** v0.1.1 – Stabilisierung und Qualitätssicherung

---

## Projektziele

BloodPressure verfolgt fünf zentrale Ziele:

1. **Einfache Erfassung:** Blutdruckwerte schnell und nachvollziehbar dokumentieren.
2. **Transparente Auswertung:** Messwerte und zeitliche Entwicklungen verständlich visualisieren.
3. **Medizinische Dokumentation:** Strukturierte Verlaufsberichte für Arztgespräche bereitstellen.
4. **Datenschutz:** Persönliche Gesundheitsdaten grundsätzlich lokal verwalten.
5. **Plattformunabhängigkeit:** Android-App und installierbare Web-App aus einer gemeinsamen Codebasis bereitstellen.

Die Anwendung ist als persönliches Dokumentationswerkzeug konzipiert und ersetzt keine medizinische Diagnostik.

---

## Funktionsumfang

### Dashboard

Das Dashboard bietet einen kompakten Überblick über die gespeicherten Messwerte.

- Anzeige der letzten Blutdruckmessung
- Systolischer und diastolischer Blutdruck
- Pulsfrequenz
- Statistische Mittelwerte
- Minima und Maxima
- Zeitliche Entwicklung
- Morgen- und Abendvergleich
- Blutdruckklassifizierung mit Referenzwerten
- Interaktive Visualisierungen

### Messwerterfassung

**Manuelle Eingabe**

Blutdruckmessungen können mit folgenden Informationen gespeichert werden:

- Systolischer Blutdruck (mmHg)
- Diastolischer Blutdruck (mmHg)
- Puls (BPM)
- Datum und Uhrzeit
- Messarm
- Körperhaltung
- Notizen und Messkontext

**Kameraunterstützte Erfassung**

Die Anwendung verfügt über eine kameragestützte Messwerterkennung.

Messgeräte-Displays können fotografiert und die erkannten Werte in die Eingabemaske übernommen werden.

Vor dem Speichern müssen erkannte Messwerte vom Benutzer kontrolliert und bestätigt werden.

Die Erkennungsqualität hängt unter anderem von Beleuchtung, Bildschärfe und Displaydarstellung ab.

### Visualisierung und Analytik

BloodPressure enthält verschiedene grafische Auswertungsmöglichkeiten.

**Blutdruck-Zeitreihe**

- Verlauf von Systole und Diastole
- Referenzlinien
- Zeitraumauswahl
- Interaktive Messpunktanzeige
- Optionaler gleitender Durchschnitt

**Kalender-Heatmap**

Kalenderbasierte Darstellung der Tagesmittelwerte mit einer Montag-bis-Sonntag-Struktur.

Unterstützte Messgrößen:

- Systolischer Blutdruck
- Diastolischer Blutdruck
- Puls

Tage ohne Messung werden gesondert dargestellt. Mehrere Messungen eines Tages werden für die Tagesübersicht aggregiert.

**Scatterplot**

Darstellung des Zusammenhangs zwischen systolischen und diastolischen Messwerten.

**Messwertverteilung**

Häufigkeitsverteilung der gemessenen Blutdruckwerte nach Wertebereichen.

### PDF-Berichte und Datenexport

BloodPressure kann strukturierte Blutdruck-Verlaufsberichte im DIN-A4-Format erzeugen.

Die Berichte umfassen unter anderem:

- Patientenprofil
- Auswertungszeitraum
- Statistische Kennzahlen
- Blutdruckdiagramme
- Kalender-Heatmap
- Messwertverteilung
- Vollständiges Messprotokoll

Weitere Exportmöglichkeiten:

- CSV für Tabellenkalkulationsprogramme
- JSON-Datensicherung
- Wiederherstellung vorhandener Datenbestände

### Profile

Die Anwendung unterstützt die Verwaltung mehrerer persönlicher Profile.

Jedes Profil besitzt einen eigenen Messdatenbestand.

Mögliche Profildaten:

- Name oder Pseudonym
- Geburtsjahr
- Geschlecht
- Körpergröße
- Gewicht
- BMI
- Medikamentennotizen

### Demo- und Betriebsmodus

Die Anwendung sieht eine Trennung zwischen Demonstrationsdaten und produktiven Messwerten vor.

Demodaten dienen ausschließlich der Erprobung von Funktionen und Visualisierungen.

Produktive Messwerte dürfen nicht mit Demonstrationsdaten vermischt werden.

---

## Technologie-Stack

| Bereich | Technologie |
|---|---|
| Benutzeroberfläche | React |
| Programmiersprache | TypeScript |
| Build-System | Vite |
| Android-Integration | Capacitor |
| Android-Build | Android Studio / Gradle |
| Web-Installation | Progressive Web App |
| Offline-Unterstützung | Service Worker |
| PDF-Erstellung | JavaScript-basierte PDF-Generierung |
| Datenaustausch | CSV / JSON |
| Entwicklungsumgebung | Google AI Studio / Visual Studio Code / Android Studio |

Die Anwendung verwendet eine gemeinsame React-Codebasis für Web und Android.

### Architektur

```text
BloodPressure
│
├── React / TypeScript
│   ├── Dashboard
│   ├── Messwerterfassung
│   ├── Profile
│   ├── Analytik
│   └── Berichte
│
├── Datenverarbeitung
│   ├── Messwertverwaltung
│   ├── Statistische Berechnungen
│   ├── Kalenderaggregation
│   └── Exportfunktionen
│
├── Progressive Web App
│   ├── Web App Manifest
│   ├── Service Worker
│   └── Offline-Betrieb
│
└── Capacitor
    ├── Android WebView
    ├── Kamera
    ├── Dateisystem
    └── Teilen / Export
```

---

## Lokale Entwicklungsumgebung

### Voraussetzungen

- Node.js und npm
- Android Studio mit Android SDK für Android-Builds
- Java Development Kit in einer mit Gradle kompatiblen Version
- Git (optional)

### Repository klonen

```bash
git clone <REPOSITORY-URL>
cd <REPOSITORY-VERZEICHNIS>
```

Die Platzhalter müssen durch die tatsächliche Repository-Adresse und den Verzeichnisnamen ersetzt werden.

### Abhängigkeiten installieren

```bash
npm install
```

### Entwicklungsserver starten

```bash
npm run dev
```

### Produktionsbuild erstellen

```bash
npm run build
```

Der Produktionsbuild erzeugt die Web-Anwendung im Verzeichnis `dist`.

### Android-Projekt synchronisieren

```bash
npx cap sync android
```

### Android Studio öffnen

```bash
npx cap open android
```

Alternativ kann das Verzeichnis `android` direkt in Android Studio geöffnet werden.

### Debug-APK erstellen

In Android Studio:

**Build → Build Bundle(s) / APK(s) → Build APK(s)**

Der typische Ausgabeort lautet:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Die Debug-APK ist für Entwicklungs- und Funktionstests vorgesehen.

Für eine reguläre Veröffentlichung ist ein entsprechend konfigurierter und signierter Release-Build erforderlich.

---

## Datenschutz und Datensicherheit

BloodPressure ist auf eine lokale Verwaltung persönlicher Gesundheitsdaten ausgelegt.

Grundprinzipien:

- Lokale Speicherung der Messwerte
- Keine erforderliche Benutzerregistrierung
- Keine verpflichtende Cloud-Synchronisierung
- Datenexport unter Kontrolle des Benutzers
- Manuelle Sicherung und Wiederherstellung
- Trennung unterschiedlicher Profile

**Wichtiger Hinweis:** Lokale Speicherung bedeutet nicht automatisch, dass alle Daten verschlüsselt sind. Die tatsächlichen Schutzmaßnahmen hängen von der jeweiligen Implementierung, dem Betriebssystem und den Geräteeinstellungen ab.

Exportierte PDF-, CSV- und JSON-Dateien können sensible Gesundheitsdaten enthalten und sollten entsprechend geschützt werden.

Vor einer öffentlichen Veröffentlichung werden Datenschutz, Berechtigungen, Netzwerkzugriffe und Abhängigkeiten gesondert geprüft.

---

## Medizinischer Hinweis

BloodPressure dient der persönlichen Dokumentation und grafischen Auswertung von Blutdruckmessungen.

Die Anwendung ist kein Ersatz für eine ärztliche Untersuchung, Diagnose oder Behandlung.

Automatische Klassifizierungen und farbliche Referenzbereiche sind Orientierungshilfen. Sie dürfen nicht als eigenständige medizinische Diagnose interpretiert werden.

Einzelmessungen erlauben keine zuverlässige Aussage über eine dauerhafte Blutdruckerkrankung.

Medikamentöse Behandlungen dürfen nicht eigenmächtig aufgrund der dargestellten Auswertungen verändert werden.

---

## Entwicklungsstatus und Qualitätssicherung

### Version 0.1.1

Bereits praktisch erprobte Bereiche:

- Android-Installation
- Profilverwaltung
- Manuelle Messwerterfassung
- Lokale Messwertspeicherung
- Dashboard
- Interaktive Kalender-Heatmap
- PDF-Berichtserstellung

### Bekannte Einschränkungen

Die aktuelle Version befindet sich weiterhin in der Qualitätssicherung.

Bekannte Verbesserungsbereiche:

- Einheitliche Kalenderzuordnung zwischen Android-Dashboard und PDF-Bericht
- Lesbarkeit von Scatterplot und Zeitreihendiagrammen
- Responsive Darstellung einzelner Bedienelemente
- PDF-Layout und Typografie
- Sicherheitsprüfung der verwendeten Abhängigkeiten

### Stabilisierung v0.1.2

Für die nächste Version gilt ein **Feature Freeze**.

Es werden keine neuen Funktionen entwickelt.

Schwerpunkte:

1. Datenintegrität
2. Fehlerbehebung
3. Datenschutz und Sicherheit
4. Konsistente statistische Berechnungen
5. Lesbare Diagramme und PDF-Berichte
6. Regressionstests
7. Zuverlässige Android-Updates

Die Produktivfreigabe erfolgt erst nach erfolgreicher Qualitätssicherung.

---

## Projektphilosophie

BloodPressure verfolgt einen pragmatischen Entwicklungsansatz:

**Einfach erfassen. Verständlich auswerten. Sicher dokumentieren.**

Die Anwendung soll keine möglichst große Anzahl von Funktionen bieten, sondern einen übersichtlichen, zuverlässigen und langfristig wartbaren digitalen Blutdruckmanager.

Stabilität, Datenintegrität und Bedienbarkeit haben Vorrang vor zusätzlichem Funktionsumfang.

---

## Mitwirkung und Lizenz

Das Projekt befindet sich in aktiver Entwicklung.

Fehlerberichte und konstruktive Verbesserungsvorschläge sind willkommen, sofern das Repository dafür freigegeben ist.

Die Lizenzbedingungen werden durch eine separate `LICENSE`-Datei festgelegt. Solange keine Lizenz veröffentlicht wurde, ist die Nutzung und Weiterverbreitung nicht automatisch als Open Source freigegeben.

---

**BloodPressure – Intelligenter Blutdruckmanager**

*Entwickelt mit Unterstützung von KI-gestützten Entwicklungswerkzeugen.*
