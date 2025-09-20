# FTG Sportfabrik Bonus Cards - Operations Guide

This guide explains daily operations for reception staff using the FTG Sportfabrik Digital Bonus Cards system.

## Getting Started

### Starting the Application

#### Windows
1. **Desktop Shortcut:** Double-click "FTG Bonus Cards" icon on desktop
2. **Start Menu:** Start → All Programs → FTG Sportfabrik Bonus Cards
3. **Search:** Type "FTG Bonus Cards" in Windows search

#### Linux
1. **Applications Menu:** Applications → Office → FTG Sportfabrik Bonus Cards
2. **Desktop:** Double-click application icon (if installed)
3. **Terminal:** Type `bonus-cards` (if installed via DEB package)

### First Time Setup

When you start the application for the first time:

1. **Login Screen** will appear
2. **Enter your credentials** provided by your administrator
3. **Click "Anmelden" (Login)** to access the system

## Main Interface

### Reception Screen

The main reception screen contains:

#### Header Section
- **Title:** "Empfang - Besuchsverrechnung" (Reception - Visit Billing)
- **Status Indicator:** Shows API connection status (see Status Indicator Guide below)
- **User Info:** Your name and logout button
- **Admin Button:** (Only visible for admin users)

#### Left Panel - Scanner Section
- **Scanner Input Field:** For scanning bonus cards
- **Action Button:** "Besuch verrechnen" (Bill Visit) - appears after scanning

#### Right Panel - Card Information
- **Card Details:** Shows member information and card status
- **Visit History:** Recent visits for the scanned card

### Status Indicator Guide

The status indicator in the header shows the connection to the server:

| Color | Status | Meaning | Action Required |
|-------|--------|---------|-----------------|
| 🟢 Green | "Verbunden" | Connected to server | None - system working normally |
| 🟡 Yellow | "Prüfen..." | Checking connection | Wait a moment - system is testing |
| 🔴 Red | "Getrennt" | Disconnected from server | Contact IT support immediately |

#### When to Contact IT Support

**Immediately contact IT if:**
- Status indicator shows red "Getrennt" for more than 30 seconds
- You cannot scan cards (scanner not responding)
- Error messages appear that you cannot resolve

## Daily Operations

### Processing Visits

#### Step 1: Scan Member Card
1. **Position the card** near the scanner or input field
2. **Scan the card** - the barcode/QR code will be read automatically
3. **Wait for card information** to appear on the right panel

#### Step 2: Verify Member Information
Check that the displayed information is correct:
- **Member Name:** Verify this matches the person
- **Card Status:** Should show "Active" (green)
- **Remaining Uses:** Check if visits are available (for limited cards)
- **Expiry Date:** Ensure card is not expired

#### Step 3: Process the Visit
1. **Click "Besuch verrechnen"** (Bill Visit) button
2. **Confirm the action** in the popup dialog
3. **Wait for confirmation** - a green success message will appear
4. **Receipt email** will be sent automatically (if configured)

### Card Status Types

| Status | German | Color | Action |
|--------|--------|-------|--------|
| Active | Aktiv | Green | ✅ Process normally |
| Expired | Abgelaufen | Red | ❌ Cannot process - refer to admin |
| Used Up | Aufgebraucht | Orange | ❌ No visits remaining - refer to admin |
| Cancelled | Storniert | Red | ❌ Card cancelled - refer to admin |

### Error Handling

#### Common Error Messages

**"Karte nicht gefunden" (Card Not Found)**
- **Cause:** Card not in system or scan error
- **Solution:** Try scanning again, check card condition
- **If persistent:** Contact admin to verify card registration

**"Keine Besuche verfügbar" (No Visits Available)**
- **Cause:** Card has no remaining visits
- **Solution:** Refer member to admin for card renewal

**"Karte abgelaufen" (Card Expired)**
- **Cause:** Card past expiry date
- **Solution:** Refer member to admin for card renewal

**"Verbindungsfehler" (Connection Error)**
- **Cause:** Network or server issue
- **Solution:** Check status indicator, contact IT if red

#### When Scans Don't Work

1. **Check the card condition:**
   - Clean the barcode/QR code
   - Ensure card is not damaged
   - Try different angle or position

2. **Check the scanner:**
   - Ensure scanner light is on
   - Try moving card closer/further
   - Check USB connection (if applicable)

3. **Manual entry:**
   - Some cards may allow manual serial number entry
   - Type the card number in the scanner field

### End of Shift Procedures

#### Before Logging Out

1. **Complete any pending transactions**
2. **Check that all scanned cards were processed**
3. **Note any issues** that occurred during the shift
4. **Report problems** to the next shift or IT support

#### Logging Out

1. **Click "Abmelden" (Logout)** in the top-right corner
2. **Confirm logout** when prompted
3. **Close the application** or leave it running for the next user

## Troubleshooting

### Application Issues

#### Application Won't Start
1. **Check desktop shortcut** - ensure it's not corrupted
2. **Try starting from Start Menu** (Windows) or Applications Menu (Linux)
3. **Restart your computer** if problem persists
4. **Contact IT support** for further assistance

#### Application Freezes or Crashes
1. **Wait 30 seconds** - sometimes the system is just slow
2. **Close and restart** the application
3. **Check status indicator** when restarted
4. **Note what you were doing** when it crashed for IT support

#### Scanner Not Working
1. **Check physical connections** - USB cables, power
2. **Try a different USB port**
3. **Restart the application**
4. **Test with a known good card**
5. **Contact IT support** if scanner still doesn't work

### Network Issues

#### Slow Performance
- **Status indicator yellow/red:** Network connectivity issue
- **Wait a few moments** for connection to stabilize
- **Contact IT** if performance doesn't improve

#### Cannot Access Server
- **Status indicator red:** Server connection lost
- **Check your internet connection**
- **Try refreshing by restarting application**
- **Contact IT immediately** if problem persists

### Data Issues

#### Wrong Member Information Displayed
1. **Verify card scan was correct**
2. **Check card number matches what you scanned**
3. **Try scanning again**
4. **Contact admin** if information is consistently wrong

#### Visit Not Recorded
1. **Check for confirmation message** - should show green success
2. **Look at recent visits list** to verify it was recorded
3. **If not recorded:** Contact admin to manually add visit
4. **Note card number and time** for admin reference

## Getting Help

### Contact Information

#### For Technical Issues (IT Support)
- **When to call:** Application problems, network issues, hardware problems
- **Phone:** [IT Support Phone]
- **Email:** [IT Support Email]
- **Hours:** [Support Hours]

#### For Card/Member Issues (Admin/Management)
- **When to call:** Card registration, member data, billing questions
- **Phone:** [Admin Phone]
- **Email:** [Admin Email]
- **Hours:** [Admin Hours]

### Information to Provide When Seeking Help

#### For Technical Support
1. **Your name and location**
2. **Time when problem occurred**
3. **What you were trying to do**
4. **Exact error message** (take a photo if possible)
5. **Status indicator color** at the time

#### For Card/Member Issues
1. **Member name** (if known)
2. **Card serial number**
3. **What happened** when you tried to process
4. **Time of incident**

### Emergency Procedures

#### If System is Completely Down

1. **Record visits manually** on paper with:
   - Member name
   - Card number (if visible)
   - Time of visit
   - Your name

2. **Contact IT support immediately**

3. **Inform members** of the technical issue

4. **Continue with manual process** until system is restored

5. **Enter manual records** into system once restored (admin will help)

## Log Files for Troubleshooting

### Where to Find Logs

If IT support asks for log files, they are located at:

**Windows:**
```
C:\Users\[your-username]\AppData\Roaming\bonus-cards\logs\
```

**Linux:**
```
/home/[your-username]/.config/bonus-cards/logs/
```

### Recent Log Entries

The application keeps daily log files. The current day's log file contains information about:
- When you logged in/out
- Cards that were scanned
- Any errors that occurred
- Network connection status

**Note:** You don't need to access these files yourself - IT support will guide you if needed.

## Tips for Efficient Operation

### Best Practices

1. **Keep cards clean** - remind members to keep cards in good condition
2. **Scan steadily** - don't move the card too quickly
3. **Watch the status indicator** - address connection issues early
4. **Process one card at a time** - complete each transaction before the next
5. **Keep the scanner area clear** - remove obstacles and clutter

### Speed Tips

1. **Learn the card positions** - find the best angle for your scanner
2. **Use keyboard shortcuts** - Enter key often confirms actions
3. **Keep workspace organized** - quick access to frequently needed items
4. **Know common error solutions** - faster resolution of routine issues

### Member Interaction

1. **Explain the process** - let members know what you're doing
2. **Be patient with card issues** - not every scan works on the first try
3. **Provide clear information** - explain any issues or delays
4. **Direct to appropriate help** - know when to refer to admin vs. IT

## System Updates

### Update Notifications

Occasionally, you may see a message about system updates:

1. **"Nach Updates suchen"** in the Help menu shows update availability
2. **Updates are manual** - the system will not update automatically
3. **Contact IT** before installing any updates
4. **Continue normal operations** until IT schedules the update

### During Updates

- **IT will coordinate** all system updates
- **You may be asked to close** the application temporarily
- **Normal operations resume** after updates are complete
- **Report any issues** immediately after updates

## Training and Reference

### New User Training

New reception staff should:
1. **Complete this operations guide**
2. **Practice with test cards** (provided by admin)
3. **Shadow experienced staff** for at least one shift
4. **Know emergency procedures** before working alone

### Quick Reference

Keep this information handy:
- **IT Support:** [Contact Info]
- **Admin Contact:** [Contact Info]
- **Status Indicator:** Green=Good, Yellow=Wait, Red=Call IT
- **Common Errors:** See Error Handling section above

---

**Last Updated:** [Date]  
**Version:** 1.0  
**For questions about this guide:** Contact [Documentation Owner]