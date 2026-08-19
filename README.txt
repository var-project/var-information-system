VAR Information System
======================

1. Application Overview
-----------------------
VAR Information System is a lightweight HTML, CSS, vanilla JavaScript, and Firebase Realtime Database control panel for changing a fullscreen viewer display.

Firebase is used for real-time syncing between different browsers, devices, or networks. No NodeJS, npm, build tool, backend server, or UI framework is required.

Open controller.html on the operator device and viewer.html on the display device. When an operator clicks a status button in controller.html, viewer.html updates its background image to the matching PNG file.

Example:

- A1 button changes viewer.html background to A1.png
- A2 button changes viewer.html background to A2.png
- B1 button changes viewer.html background to B1.png
- C3 button changes viewer.html background to C3.png
- F5 button changes viewer.html background to F5.png
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

Firebase database path used by the application:

/var_status


3. File Structure
-----------------
Main application files:

controller.html
viewer.html
script.js
bg.png
README.txt

Place your VAR image files inside the img folder:

img/A1.png
img/A2.png
img/A3.png
img/A4.png
img/A5.png
img/A6.png
img/A7.png
img/A8.png
img/B1.png
img/B2.png
img/B3.png
img/B4.png
img/C1.png
img/C2.png
img/C3.png
img/C4.png
img/C5.png
img/C6.png
img/D1.png
img/D2.png
img/D3.png
img/D4.png
img/E1.png
img/E2.png
img/F1.png
img/F2.png
img/F3.png
img/F4.png
img/F5.png
clear.png

Optional:

img/CUSTOM.png


4. How To Use
-------------
1. Open viewer.html on the display device.
2. Put viewer.html on the display output.
3. Make viewer.html fullscreen.
4. Open controller.html on the operator device (same or different PC/phone).
5. Click a VAR status button.
6. viewer.html changes its background to the matching PNG file in real time.

Use the Viewer Message button in the Last Sent panel to switch between:

- Show message text over bg.png
- Hide message text and show only the selected code graphic

This setting is global. It applies to every VAR status button until changed again.

The controller keeps:

- Last selected status
- Last selected time
- Color indicator
- Viewer message visibility
- Latest 10-item history

This history is stored in browser localStorage.


5. Image Naming Rules
---------------------
Each PNG filename must match the status code exactly.

Examples:

img/A1.png
img/B3.png
img/C6.png
img/D2.png
img/E1.png
img/F5.png
clear.png

Use uppercase filenames to avoid hosting problems on case-sensitive servers.


6. Preparing Display Graphics
-----------------------------
Create each PNG at the resolution required by your display system.

Recommended sizes:

- 1920 x 1080 for Full HD
- 3840 x 2160 for 4K
- Match the exact LED wall or broadcast output size when required

Use high-contrast text suitable for stadium screens, media centers, and broadcast monitors.


7. Viewer Background Behavior
-----------------------------
viewer.html starts with bg.png.

When Show Message is active, viewer.html uses bg.png from the root folder and displays the selected VAR message text above it.

When Hide Message is active, viewer.html hides the text and uses the matching PNG from the img folder.

Example:

A1 selected with Hide Message:

background-image: img/A1.png

A1 selected with Show Message:

background-image: bg.png

Hide the message when your PNG already contains the final screen graphic.


8. Replacing bg.png
-------------------
viewer.html uses bg.png as the default background.

To change the default background, replace bg.png with another PNG file using the same filename.


9. Mobile Usage Recommendations
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


10. Fullscreen Instructions
---------------------------
Open viewer.html and use browser fullscreen mode.

Windows and Linux:

F11

macOS:

Use the browser fullscreen command.


11. Hosting
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


12. Internet Connection Requirements
------------------------------------
Firebase Realtime Database requires internet access on both the controller
and viewer devices for cross-device syncing to work.

If internet is unavailable, the app falls back to BroadcastChannel
(same browser only) and localStorage (same device only).


13. Browser Compatibility
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


14. Troubleshooting
-------------------
Problem: viewer.html does not change after clicking A1.

- Confirm both devices have internet access.
- Confirm the Firebase connection indicator shows "Firebase" with a green dot on the controller.
- Refresh viewer.html; it restores the latest selected status from Firebase.
- If using the same browser, BroadcastChannel and localStorage also sync as fallback.
- Check the browser console for Firebase errors.

Problem: Message text appears over the graphic.

- Click HIDE MESSAGE in controller.html.
- The viewer will keep showing only the selected PNG graphic from the img folder until SHOW MESSAGE is clicked.

Problem: A1 background does not appear.

- Confirm img/A1.png exists.
- Confirm the filename is uppercase A1.png inside the img folder.
- If hosted online, confirm the file was uploaded.

Problem: Browser shows only bg.png.

- The selected PNG file is missing or the filename does not match the status code.
- Check uppercase/lowercase spelling.

Problem: Mobile layout looks cramped.

- Rotate the device to landscape mode.
- Use a tablet or laptop for primary match operation when possible.
