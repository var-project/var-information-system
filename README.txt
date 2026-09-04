VAR Information System
======================

1. Application Overview
-----------------------
VAR Information System is a lightweight HTML, CSS, vanilla JavaScript, and Firebase Realtime Database control panel for changing fullscreen viewer displays for match numbers 1 through 999.

Firebase is used for real-time syncing between different browsers, devices, or networks. No NodeJS, npm, build tool, or backend server is required. The controller uses Bootstrap CSS plus local custom CSS for a compact operator layout.

Open controller.html on the operator device and viewer.html on the display device. When an operator clicks a status button in controller.html, the matching viewer updates to the selected message text or code image.

Example:

- A1 button can show png/A1.png or jpg/A1.jpg
- A2 button can show png/A2.png or jpg/A2.jpg
- B1 button can show png/B1.png or jpg/B1.jpg
- C3 button can show png/C3.png or jpg/C3.jpg
- G4 button can show png/G4.png or jpg/G4.jpg
- CLEAR button changes viewer.html background to clear.png


2. Important Sync Limitation
----------------------------
This version uses Firebase Realtime Database for cross-device syncing.

Controller and viewer can run on different devices, browsers, or networks.
When the operator clicks a status button in controller.html, viewer.html
updates in real time via Firebase.

Examples that work:

- controller.html in one Chrome tab and viewer.html in another Chrome tab on the same laptop
- controller.html on a phone and viewer.html on a stadium display computer
- Controller on one laptop and viewer on another laptop on a different network

Both devices must have internet access for Firebase syncing to work.
If Firebase is unreachable, the app falls back to BroadcastChannel (same browser only).

Firebase database paths used by the application:

/var_status/match-1
/var_status/match-2
/var_status/match-123


3. File Structure
-----------------
Main application files:

index.html
login.html
controller.html
viewer.html
script.js
status-codes.txt
bg.png
README.txt

Place your VAR image files inside the png or jpg folder:

png/A1.png
png/A2.png
png/B1.png
png/C3.png
png/G4.png

jpg/A1.jpg
jpg/A2.jpg
jpg/B1.jpg
jpg/C3.jpg
jpg/G4.jpg

clear.png

Optional:

png/CUSTOM.png
jpg/CUSTOM.jpg


4. Editing Status Codes
-----------------------
Status button wording is stored in:

status-codes.txt

Format:

CODE|CATEGORY|WORDING

Example:

A1|Goal / No Goal|VAR Check Possible Goal

After editing status-codes.txt, refresh controller.html. When the app is hosted
on a web server, the controller reads this file directly. Some browsers block
reading text files when opened as local file:// pages, so script.js also keeps
the same built-in fallback data.


5. How To Use
-------------
1. Open viewer.html?match=1 on the display device.
2. Put viewer.html on the display output.
3. Make viewer.html fullscreen.
4. Open index.html?match=1 on the operator device (same or different PC/phone).
5. Login with the username and password from the VAR Dashboard Auth API.
6. Click a VAR status button.
7. viewer.html?match=1 updates in real time.

For simultaneous matches, open one controller and one viewer per match number:

index.html?match=1 and viewer.html?match=1
index.html?match=2 and viewer.html?match=2
index.html?match=123 and viewer.html?match=123

index.html without a match parameter still opens Match 1.
viewer.html without a match parameter still opens Match 1.

index.html is the default operator entry page. If the browser is already logged in, it redirects to controller.html. If the browser is not logged in yet, it redirects to login.html first. Direct visits to controller.html are also protected and redirect back to login.html when needed.

In the controller header, enter a match number from 1 through 999 and press
Enter, or leave the field, to switch matches. Use OPEN VIEWER to open the
viewer page for the selected match. The controller also shows a Mini Viewer preview above Last Sent so the
operator can confirm the current match output without leaving the controller.

The controller is designed as a compact operator page. Custom Message and
History are opened from buttons in the Last Sent panel, so the main status
buttons can stay visible with less scrolling.

Use Settings > Controller Theme to choose:

- System Default
- Dark
- Light

The controller uses Roboto/Open Sans with a softened light and dark palette for better readability during long operation sessions.

Use Settings > Viewer Message to switch between:

- Show message text over bg.png
- Hide message text and show only the selected code graphic

This setting is per match. It applies to every VAR status button for the selected match until changed again.

Use Settings > Code Image Format to choose the image folder and extension for
code graphics:

- PNG uses png/CODE.png
- JPG uses jpg/CODE.jpg

Each match can use a different background. By default, Match 1 uses bg.png.
Other matches automatically try bg-match-{number}.png first, with bg.png as
the fallback.

Use Settings > Match Background to override the default background per match.
Examples:

bg.png
bg-match-2.png
bg-match-123.png
png/background-3.png

The file must exist beside the HTML files, or inside a folder if the path starts with a folder name.

The controller keeps:

- Last selected status
- Last selected time
- Color indicator
- Viewer message visibility
- Latest 10-item history
- Match background

These values are stored separately for each match in browser localStorage.


6. Image Naming Rules
---------------------
Each image filename must match the status code exactly.

Examples:

png/A1.png
png/B3.png
png/C4.png
png/D2.png
png/E1.png
png/G4.png
jpg/A1.jpg
jpg/B3.jpg
clear.png

Use uppercase filenames to avoid hosting problems on case-sensitive servers.


7. Preparing Display Graphics
-----------------------------
Create each PNG/JPG at the resolution required by your display system.

Recommended sizes:

- 1920 x 1080 for Full HD
- 3840 x 2160 for 4K
- Match the exact LED wall or broadcast output size when required

Use high-contrast text suitable for stadium screens, media centers, and broadcast monitors.


8. Viewer Background Behavior
-----------------------------
viewer.html starts with bg.png.

When Show Message is active, viewer.html uses bg.png from the root folder and displays the selected VAR message text above it.

When Hide Message is active, viewer.html hides the text and uses the matching code image from the selected png or jpg folder.

Example:

A1 selected with Hide Message:

background-image: png/A1.png or jpg/A1.jpg

A1 selected with Show Message:

background-image: bg.png

Hide the message when your code image already contains the final screen graphic.


9. Replacing bg.png
-------------------
viewer.html uses bg.png as the default background.

To change the default background, replace bg.png with another PNG file using the same filename.


10. Mobile Usage Recommendations
-------------------------------
The controller is optimized for touch devices:

- Android smartphones
- iPhones
- Android tablets
- iPads
- Laptops

Recommended operation:

- Use landscape mode on small phones when possible.
- Keep the controller device charged.
- Test every button before match operation.
- Keep viewer.html open before using controller.html.
- Keep screen brightness high in stadium environments.


11. Fullscreen Instructions
---------------------------
Open viewer.html and use browser fullscreen mode.

Windows and Linux:

F11

macOS:

Use the browser fullscreen command.


12. Hosting
-----------
This app can run from:

- A local folder
- USB drive
- Static web hosting
- cPanel hosting
- Apache
- Nginx
- Any simple file host

No NodeJS, npm, backend server, or build process is required. Firebase Realtime Database is required for different browsers or different devices.


13. Internet Connection Requirements
------------------------------------
Firebase Realtime Database requires internet access on both the controller
and viewer devices for cross-device syncing to work.

If internet is unavailable, the app falls back to BroadcastChannel
(same browser only) and localStorage (same device only).


14. Browser Compatibility
-------------------------
Supported browsers:

- Chrome
- Safari
- Edge
- Android Chrome
- iOS Safari

Recommended platforms:

- Android 10+
- iOS 15+
- Windows laptops
- macOS laptops
- iPadOS tablets


15. Troubleshooting
-------------------
Problem: viewer.html does not change after clicking A1.

- Confirm both devices have internet access.
- Confirm the Firebase connection indicator shows "Firebase" with a green dot on the controller.
- Refresh viewer.html; it restores the latest selected status from Firebase.
- If using the same browser, BroadcastChannel and localStorage also sync as fallback.
- Check the browser console for Firebase errors.

Problem: Message text appears over the graphic.

- Click HIDE MESSAGE in controller.html.
- The viewer will keep showing only the selected code graphic from the png or jpg folder until SHOW MESSAGE is clicked.

Problem: A1 background does not appear.

- Confirm png/A1.png or jpg/A1.jpg exists, depending on the selected Code Image Format.
- Confirm the filename is uppercase A1.png or A1.jpg inside the selected folder.
- If hosted online, confirm the file was uploaded.

Problem: Browser shows only bg.png.

- The selected image file is missing or the filename does not match the status code.
- Check uppercase/lowercase spelling.

Problem: Mobile layout looks cramped.

- Rotate the device to landscape mode.
- Use a tablet or laptop for primary match operation when possible.
