const LAST_STATUS_KEY = "vis:lastStatus";
const HISTORY_KEY = "vis:history";
const MESSAGE_VISIBILITY_KEY = "vis:showMessage";
const CHANNEL_NAME = "vis:status";
const AUTH_KEY = "vis:authenticated";
const CONTROLLER_PASSWORD = "visproject2026";

const categories = [
  {
    id: "goal",
    title: "Goal / No Goal",
    shortcutHint: "Keys 1-8",
    color: "white",
    items: [
      { code: "A1", text: "VAR Check Possible Goal" },
      { code: "A2", text: "VAR Check Possible No Goal" },
      { code: "A3", text: "Check Complete Goal Confirmed" },
      { code: "A4", text: "Check Complete Goal Cancelled" },
      { code: "A5", text: "Check Complete Decision No Goal" },
      { code: "A6", text: "Check Complete Decision No Offside" },
      { code: "A7", text: "Check Complete Decision Offside" },
      { code: "A8", text: "VAR Review" }
    ]
  },
  {
    id: "penalty",
    title: "Penalty",
    shortcutHint: "Keys C1-C6",
    color: "#FACC15",
    items: [
      { code: "C1", text: "VAR Check Possible Penalty" },
      { code: "C2", text: "VAR Check Possible No Penalty" },
      { code: "C3", text: "Check Complete Decision Penalty" },
      { code: "C4", text: "Check Complete Decision No Penalty" },
      { code: "C5", text: "Check Complete Decision Retaken Penalty" },
      { code: "C6", text: "Check Complete Decision Offside" }
    ]
  },
  {
    id: "red-card",
    title: "Red Card",
    shortcutHint: "Keys B1-B4",
    color: "#3B82F6",
    items: [
      { code: "B1", text: "VAR Check Possible Red Card" },
      { code: "B2", text: "VAR Check Possible No Red Card" },
      { code: "B3", text: "Check Complete Decision Red Card" },
      { code: "B4", text: "Check Complete Decision No Red Card" }
    ]
  },
  {
    id: "any-situation",
    title: "Any Situation",
    shortcutHint: "General status",
    color: "#FDE047",
    items: [
      { code: "E1", text: "VAR Check" },
      { code: "E2", text: "Check Complete" }
    ]
  },
  {
    id: "mistaken-identity",
    title: "Mistaken Identity",
    shortcutHint: "Disciplinary identity",
    color: "#FB923C",
    items: [
      { code: "D1", text: "VAR Check Mistaken Identity" },
      { code: "D2", text: "Check Complete Decision Mistaken Identity" },
      { code: "D3", text: "VAR Check Red Card Mistaken" },
      { code: "D4", text: "VAR Check Yellow Card Mistaken" }
    ]
  },
  {
    id: "var-status",
    title: "VAR Status",
    shortcutHint: "System availability",
    color: "#22C55E",
    items: [
      { code: "F1", text: "VAR Inactive" },
      { code: "F2", text: "VAR Active" },
      { code: "F3", text: "VAR Suspended" },
      { code: "F4", text: "VAR Active & Resumed" },
      { code: "F5", text: "VAR Terminated" }
    ]
  }
];

let toastTimer = null;
let pendingShortcutPrefix = "";
let pendingShortcutTimer = null;
let statusChannel = null;

function getFirebaseDb() {
  if (typeof firebase !== "undefined" && firebase.apps.length > 0) {
    return firebase.database();
  }
  return null;
}

function initializeControllerAuth() {
  if (sessionStorage.getItem(AUTH_KEY) === "true") {
    showControllerApp();
    return;
  }

  const overlay = document.getElementById("loginOverlay");
  const input = document.getElementById("loginPassword");
  const button = document.getElementById("loginButton");
  const error = document.getElementById("loginError");

  if (!overlay || !input || !button) {
    initializeController();
    return;
  }

  const attemptLogin = () => {
    const password = input.value;
    if (password === CONTROLLER_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "true");
      showControllerApp();
    } else {
      error.textContent = "Incorrect password. Try again.";
      input.classList.add("error");
      input.value = "";
      input.focus();
      setTimeout(() => {
        input.classList.remove("error");
      }, 1500);
    }
  };

  button.addEventListener("click", attemptLogin);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      attemptLogin();
    }
  });

  input.focus();
}

function showControllerApp() {
  const overlay = document.getElementById("loginOverlay");
  const content = document.getElementById("appContent");
  if (overlay) overlay.classList.add("hidden");
  if (content) content.classList.add("authenticated");
  initializeController();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "controller") {
    initializeControllerAuth();
  }

  if (page === "viewer") {
    initializeViewer();
  }
});

function sendLocalStatus(data) {
  const payload = {
    code: data.code,
    text: data.text,
    color: data.color,
    showMessage: getMessageVisibility(),
    time: data.time || Date.now()
  };

  saveLatestStatus(payload);
  publishStatus(payload);

  return Promise.resolve({
    fileName: getStatusFileName(payload.code)
  });
}

function getStatusFileName(code) {
  return `${String(code || "STANDBY").toUpperCase()}.png`;
}

function getStatusChannel() {
  if (!("BroadcastChannel" in window)) {
    return null;
  }

  if (!statusChannel) {
    statusChannel = new BroadcastChannel(CHANNEL_NAME);
  }

  return statusChannel;
}

function publishStatus(data) {
  const channel = getStatusChannel();
  if (channel) {
    channel.postMessage(data);
  }

  const db = getFirebaseDb();
  if (db) {
    db.ref("vis/status").set(data).catch((error) => {
      console.error("Firebase write failed:", error);
    });
  }
}

function listenLocalStatus(callback) {
  const channel = getStatusChannel();
  if (channel) {
    channel.addEventListener("message", (event) => {
      if (event.data && event.data.code) {
        callback(event.data);
      }
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== LAST_STATUS_KEY || !event.newValue) return;

    try {
      const data = JSON.parse(event.newValue);
      if (data && data.code) {
        callback(data);
      }
    } catch (error) {
      console.error("Unable to read local VAR status:", error);
    }
  });

  const db = getFirebaseDb();
  if (db) {
    db.ref("vis/status").on("value", (snapshot) => {
      const data = snapshot.val();
      if (data && data.code) {
        callback(data);
      }
    });
  }
}

function initializeController() {
  renderCategories();
  renderClock();
  setInterval(renderClock, 1000);

  const cachedStatus = getLatestStatus();
  if (cachedStatus) {
    renderLastSent(cachedStatus);
  }

  renderHistory(getHistory());
  bindCustomMessage();
  bindClearButton();
  bindMessageToggle();
  bindKeyboardShortcuts();
  monitorConnection();
}

function renderCategories() {
  const grid = document.getElementById("categoriesGrid");
  if (!grid) return;

  grid.innerHTML = "";

  categories.forEach((category) => {
    const card = document.createElement("section");
    card.className = "category-card";
    card.style.setProperty("--category-color", category.color);
    card.setAttribute("aria-labelledby", `${category.id}-title`);

    const header = document.createElement("div");
    header.className = "category-header";

    const title = document.createElement("h2");
    title.id = `${category.id}-title`;
    title.textContent = category.title;

    const hint = document.createElement("p");
    hint.textContent = category.shortcutHint;

    const list = document.createElement("div");
    list.className = "button-list";

    category.items.forEach((item) => {
      const button = document.createElement("button");
      button.className = "status-button";
      button.type = "button";
      button.dataset.code = item.code;
      button.style.setProperty("--category-color", category.color);
      button.innerHTML = `<span class="status-code">${item.code}</span><span class="status-text">${item.text}</span>`;
      button.addEventListener("click", () => handleSend({
        code: item.code,
        text: item.text,
        color: category.color,
        time: Date.now()
      }, button));
      list.appendChild(button);
    });

    header.appendChild(title);
    header.appendChild(hint);
    card.appendChild(header);
    card.appendChild(list);
    grid.appendChild(card);
  });
}

function bindCustomMessage() {
  const input = document.getElementById("customMessage");
  const button = document.getElementById("sendCustom");
  if (!input || !button) return;

  const sendCustom = () => {
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }

    handleSend({
      code: "CUSTOM",
      text,
      color: "white",
      time: Date.now()
    }, button).then(() => {
      input.value = "";
    }).catch(() => {});
  };

  button.addEventListener("click", sendCustom);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendCustom();
    }
  });
}

function bindClearButton() {
  const button = document.getElementById("clearButton");
  if (!button) return;

  button.addEventListener("click", () => {
    handleSend({
      code: "CLEAR",
      text: "STANDBY",
      color: "black",
      time: Date.now()
    }, button);
  });
}

function bindMessageToggle() {
  const button = document.getElementById("messageToggle");
  if (!button) return;

  renderMessageToggle(button, getMessageVisibility());

  button.addEventListener("click", () => {
    const nextValue = !getMessageVisibility();
    setMessageVisibility(nextValue);
    renderMessageToggle(button, nextValue);

    const latestStatus = getLatestStatus();
    if (latestStatus) {
      const updatedStatus = {
        ...latestStatus,
        showMessage: nextValue,
        time: Date.now()
      };
      saveLatestStatus(updatedStatus);
      publishStatus(updatedStatus);
    } else {
      const standbyStatus = {
        code: "STANDBY",
        text: "STANDBY",
        color: "black",
        showMessage: nextValue,
        time: Date.now()
      };
      saveLatestStatus(standbyStatus);
      publishStatus(standbyStatus);
    }

    showToast(nextValue ? "Viewer Message Shown" : "Viewer Message Hidden");
  });
}

function renderMessageToggle(button, showMessage) {
  button.textContent = showMessage ? "HIDE MESSAGE" : "SHOW MESSAGE";
  button.setAttribute("aria-pressed", String(showMessage));
  button.classList.toggle("is-hidden", !showMessage);
}

function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

    if (event.key === "Escape") {
      event.preventDefault();
      const clearButton = document.getElementById("clearButton");
      if (clearButton) clearButton.click();
      return;
    }

    const key = event.key.toUpperCase();
    const code = resolveShortcutCode(key);
    if (code) {
      event.preventDefault();
      const button = document.querySelector(`[data-code="${code}"]`);
      if (button) button.click();
    }
  });
}

function resolveShortcutCode(key) {
  if (/^[1-8]$/.test(key)) return `A${key}`;

  if (["B", "C"].includes(key)) {
    pendingShortcutPrefix = key;
    clearTimeout(pendingShortcutTimer);
    pendingShortcutTimer = setTimeout(() => {
      pendingShortcutPrefix = "";
    }, 1200);
    return "";
  }

  if (pendingShortcutPrefix && /^[1-6]$/.test(key)) {
    const code = `${pendingShortcutPrefix}${key}`;
    pendingShortcutPrefix = "";
    clearTimeout(pendingShortcutTimer);
    return code;
  }

  return "";
}

function handleSend(data, sourceButton) {
  animateButton(sourceButton);
  renderLastSent(data);
  addToHistory(data);

  return sendLocalStatus(data)
    .then((result) => {
      showToast(`Viewer Updated: ${result.fileName}`);
    })
    .catch((error) => {
      console.error("Unable to update VAR viewer:", error);
      showToast("Viewer Update Failed");
    });
}

function animateButton(button) {
  if (!button) return;
  button.classList.add("is-pressed");
  setTimeout(() => {
    button.classList.remove("is-pressed");
  }, 150);
}

function renderConnectionStatus(isOnline) {
  const status = document.getElementById("connectionStatus");
  const dot = document.getElementById("connectionDot");
  if (!status || !dot) return;

  const db = getFirebaseDb();
  const modeText = db ? "Firebase" : "Local File Mode";

  status.textContent = isOnline ? modeText : "Offline";
  dot.classList.toggle("online", isOnline);
  dot.classList.toggle("offline", !isOnline);
}

function monitorConnection() {
  const db = getFirebaseDb();
  if (!db) {
    renderConnectionStatus(true);
    return;
  }

  db.ref(".info/connected").on("value", (snapshot) => {
    const connected = snapshot.val() === true;
    renderConnectionStatus(connected);
  });
}

function monitorViewerConnection() {
  const db = getFirebaseDb();
  if (!db) return;

  const connectionLost = document.getElementById("viewerConnectionLost");
  if (!connectionLost) return;

  db.ref(".info/connected").on("value", (snapshot) => {
    const connected = snapshot.val() === true;
    connectionLost.classList.toggle("show", !connected);
  });
}

function renderClock() {
  const node = document.getElementById("currentDateTime");
  if (!node) return;

  node.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

function renderLastSent(data) {
  const code = data.code || "--";
  const text = data.text || "No status sent";
  const time = formatTime(data.time);
  const color = data.color || "transparent";

  setText("headerLastCode", code);
  setText("headerLastText", text);
  setText("headerLastTime", time);
  setText("lastCode", code);
  setText("lastMessage", text);
  setText("lastTime", time);

  const colorIndicator = document.getElementById("lastColor");
  if (colorIndicator) {
    colorIndicator.style.background = color;
  }

  const headerColorIndicator = document.getElementById("headerLastColor");
  if (headerColorIndicator) {
    headerColorIndicator.style.background = color;
  }
}

function addToHistory(data) {
  const history = getHistory();
  const nextHistory = [data, ...history].slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  renderHistory(nextHistory);
}

function renderHistory(history) {
  const list = document.getElementById("historyList");
  if (!list) return;

  list.innerHTML = "";

  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "history-item";
    appendHistoryFields(empty, "--:--", "--", "No history");
    list.appendChild(empty);
    return;
  }

  history.forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";
    appendHistoryFields(row, formatTime(item.time), item.code, item.text);
    list.appendChild(row);
  });
}

function appendHistoryFields(row, time, code, message) {
  const timeNode = document.createElement("span");
  timeNode.className = "history-time";
  timeNode.textContent = time;

  const codeNode = document.createElement("strong");
  codeNode.textContent = code;

  const messageNode = document.createElement("span");
  messageNode.className = "history-message";
  messageNode.textContent = message;

  row.appendChild(timeNode);
  row.appendChild(codeNode);
  row.appendChild(messageNode);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function initializeViewer() {
  const params = new URLSearchParams(window.location.search);
  const image = params.get("image");
  if (image) {
    renderViewerImage(image);
    return;
  }

  const cachedStatus = getLatestStatus();
  if (cachedStatus) {
    renderViewerStatus(cachedStatus);
  }

  listenLocalStatus(renderViewerStatus);
  monitorViewerConnection();
}

function formatMessageText(text) {
  const words = text.split(/\s+/);
  if (words.length > 2) {
    return words.slice(0, 2).join(" ") + "<br>" + words.slice(2).join(" ");
  }
  return text;
}

function renderViewerStatus(data) {
  const message = document.getElementById("viewerMessage");
  const overlay = document.getElementById("viewerOverlay");
  const image = document.getElementById("viewerImage");
  if (!message || !overlay) return;

  const displayText = data.text || "STANDBY";
  const displayColor = data.code === "CLEAR" ? "black" : data.color;
  const imageFile = getStatusFileName(data.code);
  const showMessage = typeof data.showMessage === "boolean" ? data.showMessage : getMessageVisibility();

  if (image) {
    image.style.display = "none";
  }
  message.innerHTML = formatMessageText(displayText || "STANDBY");
  message.style.display = showMessage ? "block" : "none";
  overlay.style.background = getOverlayColor(displayColor);
  document.body.style.backgroundImage = showMessage ? `url("bg.png")` : `url("${imageFile}"), url("bg.png")`;

  message.style.animation = "none";
  void message.offsetWidth;
  message.style.animation = "";
}

function renderViewerImage(fileName) {
  const message = document.getElementById("viewerMessage");
  const image = document.getElementById("viewerImage");
  const overlay = document.getElementById("viewerOverlay");
  if (!image || !message || !overlay) return;

  image.src = fileName;
  image.style.display = "block";
  message.style.display = "none";
  overlay.style.background = "rgba(0, 0, 0, 0.15)";
  document.body.style.backgroundImage = `url("${fileName}"), url("bg.png")`;
}

function getOverlayColor(color) {
  const normalized = String(color || "").toLowerCase();
  const overlays = {
    white: "rgba(255, 255, 255, 0.25)",
    "#3b82f6": "rgba(59, 130, 246, 0.35)",
    "#facc15": "rgba(250, 204, 21, 0.35)",
    "#fb923c": "rgba(251, 146, 60, 0.35)",
    "#fde047": "rgba(253, 224, 71, 0.35)",
    "#22c55e": "rgba(34, 197, 94, 0.35)",
    black: "rgba(0, 0, 0, 0.5)"
  };

  return overlays[normalized] || "rgba(0, 0, 0, 0.4)";
}

function saveLatestStatus(data) {
  localStorage.setItem(LAST_STATUS_KEY, JSON.stringify(data));
}

function getMessageVisibility() {
  return localStorage.getItem(MESSAGE_VISIBILITY_KEY) !== "false";
}

function setMessageVisibility(showMessage) {
  localStorage.setItem(MESSAGE_VISIBILITY_KEY, String(showMessage));
}

function getLatestStatus() {
  try {
    return JSON.parse(localStorage.getItem(LAST_STATUS_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function getHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(history) ? history : [];
  } catch (error) {
    return [];
  }
}

function formatTime(timestamp) {
  if (!timestamp) return "--:--:--";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(timestamp));
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}
