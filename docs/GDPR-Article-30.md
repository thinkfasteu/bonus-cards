# GDPR Article 30 - Verzeichnis von Verarbeitungstätigkeiten
## FTG Sportfabrik Digital Bonus Card System

**Erstellt am:** 15. Januar 2025  
**Letzte Aktualisierung:** 15. Januar 2025  
**Verantwortlicher:** FTG Sportfabrik GmbH  
**Datenschutzbeauftragter:** [Name einfügen]

---

## 1. Allgemeine Informationen

### 1.1 Verantwortlicher
**Name:** FTG Sportfabrik GmbH  
**Adresse:** [Vollständige Adresse einfügen]  
**Kontakt:** [E-Mail und Telefonnummer einfügen]  
**Handelsregistereintrag:** [HRB-Nummer einfügen]  
**Datenschutzbeauftragter:** [Name und Kontaktdaten einfügen]

### 1.2 Auftragsverarbeiter
**Name:** Supabase Inc.  
**Zweck:** Cloud-Datenbank-Hosting  
**Standort:** USA (angemessenes Schutzniveau gemäß Adequacy Decision)  
**Auftragsverarbeitungsvertrag:** Ja, gemäß Supabase DPA

---

## 2. Verarbeitungstätigkeit: Digitales Bonuskarten-System

### 2.1 Zwecke der Verarbeitung
- **Hauptzweck:** Verwaltung und Durchführung des digitalen Bonuskarten-Programms
- **Nebenzwecke:**
  - Kundenbindung und -loyalität
  - Analyse von Nutzungsmustern (anonymisiert)
  - Betrugsvorbeugung
  - Compliance und Buchhaltung

### 2.2 Kategorien betroffener Personen
- **Mitglieder:** Kunden mit gültiger Sportfabrik-Mitgliedschaft
- **Personal:** Mitarbeiter mit Zugang zum Admin-System
- **Systemadministratoren:** IT-Personal mit Systemzugriff

### 2.3 Kategorien personenbezogener Daten

#### 2.3.1 Mitgliederdaten
- **Identifikationsdaten:**
  - Eindeutige Mitglieds-ID (UUID)
  - Interne Kundennummer
- **Transaktionsdaten:**
  - Datum und Uhrzeit der Bonusnutzung
  - Verwendetes Produkt (cycling_bonus, cycling_unlimited, etc.)
  - Anzahl verwendeter Boni
  - Transaktions-ID
  - Status der Transaktion
- **Kommunikationsdaten:**
  - E-Mail-Adresse (für Belege)
  - E-Mail-Versandstatus
  - Fehlschlag-/Wiederholungsversuche

#### 2.3.2 Personal-/Admin-Daten
- **Anmeldedaten:**
  - Benutzername
  - Gehashtes Passwort (bcrypt)
  - Session-Token
  - Login-Zeitstempel
- **Aktivitätsdaten:**
  - Admin-Aktionen (Kartenerstellung, Stornierungen)
  - IP-Adressen (für Sicherheitsprotokollierung)
  - Zugriffsprotokolle

#### 2.3.3 Systemdaten
- **Technische Daten:**
  - IP-Adressen (vorübergehend für Rate-Limiting)
  - Browser-Informationen (User-Agent)
  - API-Aufrufprotokolle
  - Fehlerprotokolle

### 2.4 Empfänger oder Kategorien von Empfängern

#### 2.4.1 Interne Empfänger
- **Rezeptionspersonal:** Zugriff auf Kartenmanagement-Funktionen
- **Management:** Zugriff auf Berichte und Analysen
- **IT-Administration:** Systemwartung und -support
- **Buchhaltung:** Transaktionsberichte für Compliance

#### 2.4.2 Externe Empfänger
- **Supabase Inc.:** Database-as-a-Service-Provider
- **E-Mail-Provider:** SMTP-Service für Belegversand
- **Prüfer/Wirtschaftsprüfer:** Bei gesetzlich vorgeschriebenen Prüfungen

#### 2.4.3 Keine Übermittlung an Drittländer
- Alle Daten werden innerhalb der EU/EWR verarbeitet
- Supabase-Infrastruktur nutzt EU-Server mit angemessenem Schutzniveau

### 2.5 Fristen für die Löschung

#### 2.5.1 Transaktionsdaten
- **Aufbewahrungsdauer:** 7 Jahre (gemäß HGB/AO)
- **Löschfrist:** Automatische Löschung nach Ablauf der Aufbewahrungspflicht
- **Ausnahmen:** Bei rechtlichen Verfahren verlängerte Aufbewahrung

#### 2.5.2 Kommunikationsdaten
- **E-Mail-Belege:** 3 Jahre (für Kundenservice)
- **E-Mail-Logs:** 1 Jahr (für technische Fehleranalyse)
- **Fehlgeschlagene Zustellungen:** 30 Tage

#### 2.5.3 Admin-/Personaldaten
- **Session-Daten:** 24 Stunden nach Logout
- **Login-Protokolle:** 2 Jahre (für Sicherheitsanalyse)
- **Aktivitätsprotokolle:** 5 Jahre (für Compliance)

#### 2.5.4 Systemdaten
- **IP-Adressen:** 7 Tage (nur für Rate-Limiting)
- **Fehlerprotokolle:** 1 Jahr
- **Leistungsmetriken:** 2 Jahre (anonymisiert)

---

## 3. Technische und organisatorische Maßnahmen (TOMs)

### 3.1 Zugangskontrollen
- **Passwort-Politik:** Sichere Passwörter mit Mindestanforderungen
- **Zwei-Faktor-Authentifizierung:** Für Admin-Zugänge implementiert
- **Session-Management:** Automatisches Timeout nach Inaktivität
- **Benutzerrollen:** Differenzierte Zugriffsrechte nach Tätigkeitsbereich

### 3.2 Datenübertragungskontrollen
- **HTTPS-Verschlüsselung:** TLS 1.3 für alle API-Verbindungen
- **API-Authentifizierung:** JWT-Token mit kurzer Lebensdauer
- **CORS-Richtlinien:** Restriktive Origin-Kontrolle
- **Rate-Limiting:** Schutz vor Missbrauch und DoS-Attacken

### 3.3 Eingabekontrollen
- **Input-Validierung:** Zod-Schema-Validierung für alle Endpoints
- **SQL-Injection-Schutz:** Prepared Statements und Parameter-Binding
- **XSS-Schutz:** Input-Sanitization und Content Security Policy
- **CSRF-Schutz:** Anti-CSRF-Token für State-Changing-Operations

### 3.4 Verfügbarkeitskontrollen
- **Backup-Strategie:** Automatische tägliche Backups via Supabase
- **Monitoring:** Umfassendes Logging und Alarmierung
- **Incident Response:** Dokumentierte Verfahren für Störungen
- **Disaster Recovery:** Wiederherstellungsplan für kritische Systemausfälle

### 3.5 Trennungskontrollen
- **Datenbank-Isolierung:** Separate Schemas für verschiedene Datentypen
- **Umgebungs-Trennung:** Separate Prod/Dev/Test-Umgebungen
- **Benutzer-Isolation:** Strikte Zugriffskontrollen pro Benutzerrolle
- **Mandantenfähigkeit:** Logische Trennung verschiedener Sportfabrik-Standorte

---

## 4. Rechtsgrundlagen der Verarbeitung

### 4.1 Mitgliederdaten
**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
- **Vertragsgegenstand:** Sportfabrik-Mitgliedschaftsvertrag mit Bonusprogramm
- **Erforderlichkeit:** Notwendig zur Durchführung des vereinbarten Bonussystems
- **Zweckbindung:** Strikt limitiert auf vertraglich vereinbarte Leistungen

### 4.2 E-Mail-Kommunikation
**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
- **Zweck:** Versendung von Transaktionsbelegen
- **Berechtigung:** Teil der vereinbarten Serviceleistungen
- **Opt-out:** Technisch möglich, aber Beleg-Nachweise erforderlich

### 4.3 Admin-Protokollierung
**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse)
- **Berechtigtes Interesse:** IT-Sicherheit und Compliance
- **Interessenabwägung:** Dokumentierte Abwägung zwischen Sicherheit und Privatsphäre
- **Verhältnismäßigkeit:** Minimale notwendige Protokollierung

### 4.4 Compliance-Daten
**Rechtsgrundlage:** Art. 6 Abs. 1 lit. c DSGVO (Rechtliche Verpflichtung)
- **Verpflichtung:** HGB, AO, GwG Aufbewahrungspflichten
- **Umfang:** Nur für Compliance erforderliche Transaktionsdaten
- **Aufbewahrungsdauer:** Gesetzlich vorgeschriebene Fristen

---

## 5. Betroffenenrechte und Verfahren

### 5.1 Auskunftsrecht (Art. 15 DSGVO)
**Verfahren:**
1. Schriftliche Anfrage an Datenschutzbeauftragten
2. Identitätsprüfung durch Mitgliedsdaten-Abgleich
3. Bereitstellung aller gespeicherten Daten binnen 30 Tagen
4. Technische Umsetzung über Admin-Interface Export-Funktion

### 5.2 Berichtigungsrecht (Art. 16 DSGVO)
**Verfahren:**
1. Meldung falscher Daten über Kundenservice
2. Validierung der Korrektur-Anfrage
3. Berichtigung in Datenbank mit Protokollierung
4. Benachrichtigung des Betroffenen über Durchführung

### 5.3 Löschungsrecht (Art. 17 DSGVO)
**Verfahren:**
1. Prüfung der Löschungsberechtigung
2. Abwägung gegen Aufbewahrungspflichten
3. Pseudonymisierung oder Löschung je nach Rechtsgrundlage
4. Bestätigung der Durchführung an Betroffenen

**Einschränkungen:**
- Aufbewahrungspflichten nach HGB/AO
- Laufende Vertragserfüllung
- Berechtigte Interessen der Sicherheit

### 5.4 Widerspruchsrecht (Art. 21 DSGVO)
**Anwendung:**
- Nur bei Verarbeitung auf Grundlage berechtigter Interessen
- Individuelle Prüfung der Widerspruchsgründe
- Gegebenenfalls Einstellung der betroffenen Verarbeitung

### 5.5 Datenübertragbarkeit (Art. 20 DSGVO)
**Verfahren:**
1. Export der Mitgliederdaten in maschinenlesbarem Format (JSON)
2. Bereitstellung über sicheren Download-Link
3. Unterstützung bei direkter Übertragung an anderen Verantwortlichen

---

## 6. Datenschutz-Folgenabschätzung (DSFA)

### 6.1 DSFA-Pflicht
**Bewertung:** Durchführung einer DSFA ist empfohlen aufgrund:
- Systematischer Überwachung von Transaktionsverhalten
- Umfangreiche Profilerstellung durch Nutzungsanalysen
- Potenzielle Auswirkungen auf Betroffenenrechte

### 6.2 Verweis auf DSFA-Dokument
**Dokument:** Separate ausführliche DSFA in `docs/GDPR-DPIA.md`
- Risikoanalyse für alle Verarbeitungsschritte
- Schutzmaßnahmen und deren Bewertung
- Regelmäßige Überprüfung und Aktualisierung

---

## 7. Datenschutz-Management

### 7.1 Verantwortlichkeiten
- **Geschäftsführung:** Strategische Datenschutz-Entscheidungen
- **Datenschutzbeauftragter:** Compliance-Überwachung und Beratung
- **IT-Leitung:** Technische Umsetzung der Schutzmaßnahmen
- **Rezeptionspersonal:** Tägliche Einhaltung der Datenschutz-Richtlinien

### 7.2 Schulungen und Sensibilisierung
- **Mitarbeiter-Schulungen:** Jährliche DSGVO-Schulungen für alle Nutzer
- **Sicherheits-Briefings:** Quartalsweise Updates zu neuen Bedrohungen
- **Incident-Training:** Schulung zum Umgang mit Datenschutz-Vorfällen

### 7.3 Regelmäßige Überprüfungen
- **Vierteljährlich:** Review der Zugangsberechtigungen
- **Halbjährlich:** Überprüfung der TOMs und Sicherheitsmaßnahmen
- **Jährlich:** Vollständige Aktualisierung des Verarbeitungsverzeichnisses
- **Bei Änderungen:** Ad-hoc Anpassung bei System-Updates oder neuen Features

### 7.4 Dokumentation und Nachweise
- **Einwilligungen:** Zentrale Speicherung aller Einwilligungserklärungen
- **Verträge:** Auftragsverarbeitungsverträge mit allen Dienstleistern
- **Protokolle:** Umfassende Protokollierung aller datenschutzrelevanten Aktivitäten
- **Compliance-Nachweise:** Dokumentation der Einhaltung aller DSGVO-Anforderungen

---

## 8. Meldeverfahren bei Datenschutz-Vorfällen

### 8.1 Incident Response Team
- **Incident Manager:** IT-Leitung (24/7 erreichbar)
- **Datenschutzbeauftragter:** Compliance-Bewertung
- **Geschäftsführung:** Strategische Entscheidungen
- **Externer Anwalt:** Bei rechtlichen Risiken

### 8.2 Meldeverfahren
**Binnen 72 Stunden an Aufsichtsbehörde:**
1. Sofortige Risikobewertung bei Vorfall-Entdeckung
2. Dokumentation aller bekannten Fakten
3. Meldung an zuständige Datenschutz-Aufsichtsbehörde
4. Information betroffener Personen bei hohem Risiko

### 8.3 Präventive Maßnahmen
- **Monitoring:** Kontinuierliche Überwachung auf Anomalien
- **Backup-Verifikation:** Regelmäßige Tests der Wiederherstellbarkeit
- **Penetration Tests:** Jährliche externe Sicherheitsprüfungen
- **Vulnerability Management:** Zeitnahe Installation von Sicherheitsupdates

---

## 9. Anhänge

### 9.1 Kontaktinformationen
**Datenschutzbeauftragter FTG Sportfabrik:**
- E-Mail: [datenschutz@ftg-sportfabrik.de]
- Telefon: [+49 XXX XXXXXXX]
- Postadresse: [Vollständige Adresse]

**Zuständige Aufsichtsbehörde:**
- [Landesbeauftragte für Datenschutz und Informationsfreiheit]
- [Kontaktdaten der zuständigen Behörde]

### 9.2 Verwandte Dokumente
- Datenschutzerklärung für Mitglieder
- Auftragsverarbeitungsvertrag mit Supabase
- DSFA-Dokument (GDPR-DPIA.md)
- IT-Sicherheitsrichtlinie
- Incident Response Plan

### 9.3 Änderungshistorie
- **v1.0 (15.01.2025):** Erstversion für Produktivbetrieb
- **[Zukünftige Versionen]:** Dokumentation aller wesentlichen Änderungen

---

*Dieses Dokument unterliegt regelmäßiger Überprüfung und wird bei Änderungen der Verarbeitungstätigkeit oder der rechtlichen Anforderungen entsprechend aktualisiert.*