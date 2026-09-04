const LAST_STATUS_KEY = "vis:lastStatus";
const HISTORY_KEY = "vis:history";
const MESSAGE_VISIBILITY_KEY = "vis:showMessage";
const MATCH_BACKGROUND_KEY = "vis:background";
const STATUS_IMAGE_FORMAT_KEY = "vis:statusImageFormat";
const THEME_KEY = "vis:controllerTheme";
const CHANNEL_NAME = "vis:status";
const FIREBASE_STATUSES_PATH = "/var_status";
const AUTH_KEY = "vis:authenticated";
const AUTH_API_URL = "https://script.google.com/macros/s/AKfycbxWzKh-L6TmltjPWxItfMzYcZMhFSlljs9eS5nqcSjLXIW_r60xa9cEjVYiD5D3jwH6/exec";
const DEFAULT_MATCH_NUMBER = "1";
const DEFAULT_MATCH_ID = `match-${DEFAULT_MATCH_NUMBER}`;
const DEFAULT_BACKGROUND = "bg.png";
const DEFAULT_STATUS_IMAGE_FORMAT = "png";

const currentMatchId = getCurrentMatchId();
const currentMatchNumber = getMatchNumber(currentMatchId);

const STATUS_CODES_FILE = "status-codes.txt";
const CATEGORY_COLORS = {
  A: "white",
  B: "#3B82F6",
  C: "#A78BFA",
  D: "#FACC15",
  E: "#FB923C",
  F: "#22C55E",
  G: "#14B8A6"
};

let categories = getDefaultStatusCategories();

let toastTimer = null;
let pendingShortcutPrefix = "";
let pendingShortcutTimer = null;
let statusChannel = null;

function getFirebaseDb() {
  if (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0 && firebase.database) {
    return firebase.database();
  }
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "index") {
    initializeIndexGate();
  }

  if (page === "login") {
    applyControllerTheme();
    initializeLoginPage();
  }

  if (page === "controller") {
    applyControllerTheme();
    requireControllerAuth();
  }

  if (page === "viewer") {
    initializeViewer();
  }
});

function initializeIndexGate() {
  const controllerPage = `controller.html${window.location.search}`;
  window.location.replace(isAuthenticated() ? controllerPage : `login.html?redirect=${encodeURIComponent(controllerPage)}`);
}

function initializeLoginPage() {
  if (isAuthenticated()) {
    window.location.replace(getLoginRedirect());
    return;
  }

  const form = document.getElementById("loginForm");
  const username = document.getElementById("loginUsername");
  const password = document.getElementById("loginPassword");
  const button = document.getElementById("loginButton");
  const error = document.getElementById("loginError");
  if (!form || !username || !password || !button) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearLoginError(username, password, error);
    setLoginLoading(button, true);

    authenticateUser(username.value.trim(), password.value)
      .then((result) => {
        saveAuthSession(result);
        window.location.replace(getLoginRedirect());
      })
      .catch((loginError) => {
        showLoginError(username, password, error, loginError.message || "Login failed. Try again.");
      })
      .finally(() => {
        setLoginLoading(button, false);
      });
  });

  username.focus();
}

function requireControllerAuth() {
  if (!isAuthenticated()) {
    window.location.replace(`login.html?redirect=${encodeURIComponent(getCurrentPagePath())}`);
    return;
  }

  const content = document.getElementById("appContent");
  if (content) content.classList.add("authenticated");
  initializeController();
}

function isAuthenticated() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_KEY));
    return Boolean(session && session.authenticated === true);
  } catch (error) {
    return false;
  }
}

function saveAuthSession(result) {
  const session = {
    authenticated: true,
    username: result.username || result.user || "",
    loginAt: Date.now()
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

function getLoginRedirect() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  return isSafeLocalRedirect(redirect) ? redirect : "controller.html";
}

function getCurrentPagePath() {
  return `${window.location.pathname.split("/").pop() || "controller.html"}${window.location.search}`;
}

function isSafeLocalRedirect(value) {
  if (!value) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("//") && !value.startsWith("/");
}

function authenticateUser(username, password) {
  if (!username || !password) {
    return Promise.reject(new Error("Enter username and password."));
  }

  return fetch(AUTH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "login",
      username,
      password
    })
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to reach login server.");
      }
      return response.json();
    })
    .then((data) => {
      if (isLoginSuccess(data)) {
        return {
          ...data,
          username
        };
      }
      throw new Error(data && data.message ? data.message : "Invalid username or password.");
    });
}

function isLoginSuccess(data) {
  if (!data || data.message === "VAR Dashboard Auth API is running") return false;
  const status = String(data.status || data.result || data.message || "").toLowerCase();
  return data.success === true ||
    data.authenticated === true ||
    data.valid === true ||
    ["success", "ok", "authenticated", "login success", "login successful"].includes(status);
}

function setLoginLoading(button, isLoading) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "CHECKING..." : "LOGIN";
}

function clearLoginError(username, password, error) {
  if (error) error.textContent = "";
  username.classList.remove("error");
  password.classList.remove("error");
}

function showLoginError(username, password, error, message) {
  if (error) error.textContent = message;
  username.classList.add("error");
  password.classList.add("error");
  password.value = "";
  password.focus();
  setTimeout(() => {
    username.classList.remove("error");
    password.classList.remove("error");
  }, 1500);
}

function sendLocalStatus(data) {
  const payload = {
    code: data.code,
    text: data.text,
    color: data.color,
    showMessage: getMessageVisibility(),
    background: getMatchBackground(),
    imageFormat: getStatusImageFormat(),
    matchId: currentMatchId,
    time: data.time || Date.now()
  };

  saveLatestStatus(payload);
  return publishStatus(payload).then(() => ({
    fileName: getStatusImageFileName(payload.code, payload.imageFormat)
  }));
}

function getStatusImageFileName(code, format = getStatusImageFormat()) {
  const normalizedCode = String(code || "STANDBY").toUpperCase();
  if (normalizedCode === "CLEAR") {
    return "clear.png";
  }
  if (normalizedCode === "STANDBY") {
    return "bg.png";
  }
  const normalizedFormat = normalizeStatusImageFormat(format);
  return `${normalizedFormat}/${normalizedCode}.${normalizedFormat}`;
}

function getStatusChannel() {
  if (!("BroadcastChannel" in window)) {
    return null;
  }

  if (!statusChannel) {
    statusChannel = new BroadcastChannel(`${CHANNEL_NAME}:${currentMatchId}`);
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
    return publishFirebaseStatus(db, data);
  }

  return Promise.resolve();
}

function publishFirebaseStatus(db, data) {
  const updates = {};
  updates[getFirebaseStatusPath()] = data;

  if (currentMatchId === DEFAULT_MATCH_ID) {
    Object.entries(data).forEach(([key, value]) => {
      updates[`${FIREBASE_STATUSES_PATH}/${key}`] = value;
    });
  }

  return db.ref().update(updates).catch((error) => {
    const reason = error && error.message ? error.message : "Unknown Firebase error";
    throw new Error(`Firebase write failed: ${reason}`);
  });
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
    if (event.key !== getScopedKey(LAST_STATUS_KEY) || !event.newValue) return;

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
    db.ref(getFirebaseStatusPath()).on("value", (snapshot) => {
      const data = snapshot.val();
      if (data && data.code) {
        saveLatestStatus(data);
        callback(data);
      }
    });

    if (currentMatchId === DEFAULT_MATCH_ID) {
      db.ref(FIREBASE_STATUSES_PATH).on("value", (snapshot) => {
        const data = snapshot.val();
        if (data && data.code && !data.matchId) {
          const migratedData = {
            ...data,
            matchId: currentMatchId,
            background: data.background || getMatchBackground(),
            imageFormat: data.imageFormat || getStatusImageFormat()
          };
          saveLatestStatus(migratedData);
          callback(migratedData);
        }
      });
    }
  }
}

function initializeController() {
  renderMatchSelector();
  renderMatchIdentity();
  renderMiniViewer();
  loadStatusCategories()
    .then((loadedCategories) => {
      categories = loadedCategories;
      renderCategories();
    })
    .catch((error) => {
      console.warn("Using built-in VAR status codes:", error);
      renderCategories();
    });
  renderClock();
  setInterval(renderClock, 1000);

  const cachedStatus = getLatestStatus();
  if (cachedStatus) {
    renderLastSent(cachedStatus);
  }

  renderHistory(getHistory());
  bindCustomMessage();
  bindClearButton();
  bindControllerModals();
  bindMessageToggle();
  bindLogoutButton();
  bindThemeSelect();
  bindKeyboardShortcuts();
  monitorConnection();
}

function loadStatusCategories() {
  if (!window.fetch) {
    return Promise.resolve(getDefaultStatusCategories());
  }

  return fetch(`${STATUS_CODES_FILE}?v=${Date.now()}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ${STATUS_CODES_FILE}`);
      }
      return response.text();
    })
    .then((text) => {
      const parsedCategories = parseStatusCodes(text);
      return parsedCategories.length ? parsedCategories : getDefaultStatusCategories();
    });
}

function parseStatusCodes(text) {
  const categoryMap = new Map();

  text.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) return;

    const parts = trimmedLine.split("|").map((part) => part.trim());
    if (parts.length < 3) return;

    const code = parts[0].toUpperCase();
    const categoryTitle = parts[1];
    const wording = parts.slice(2).join("|").trim();
    const prefix = code.charAt(0);
    if (!/^[A-Z]\d{1,2}$/.test(code) || !categoryTitle || !wording) return;

    if (!categoryMap.has(prefix)) {
      categoryMap.set(prefix, {
        id: slugify(categoryTitle),
        title: categoryTitle,
        shortcutHint: `Keys ${prefix}1-${prefix}9`,
        color: CATEGORY_COLORS[prefix] || "#22C55E",
        items: []
      });
    }

    categoryMap.get(prefix).items.push({ code, text: wording });
  });

  return Array.from(categoryMap.values()).map((category) => ({
    ...category,
    shortcutHint: getShortcutHint(category.items)
  }));
}

function getDefaultStatusCategories() {
  return parseStatusCodes(`
A1|Goal / No Goal|VAR Check Possible Goal
A2|Goal / No Goal|VAR CheckPossible No Goal
A3|Goal / No Goal|Check Completed Goal Confirm
A4|Goal / No Goal|Check Completed Goal Canceled
A5|Goal / No Goal|Check Completed No Goal
A6|Goal / No Goal|Check Completed No Offside
A7|Goal / No Goal|Check Completed Offside
B1|Red Card|VAR CheckPossible Red Card
B2|Red Card|VAR CheckPossible No Red Card
B3|Red Card|Check Completed Red Card
B4|Red Card|Check Completed No Red Card
C1|2nd Yellow Card|VAR CheckPossible 2nd Yellow Card
C2|2nd Yellow Card|VAR Check Possible No 2nd Yellow Card
C3|2nd Yellow Card|Check Completed Yellow Card
C4|2nd Yellow Card|Check Completed No Yellow Card
D1|Penalty|VAR Check Possible Penalty
D2|Penalty|VAR Check Possible No Penalty
D3|Penalty|Check Completed Penalty
D4|Penalty|Check Completed No Penalty
D5|Penalty|Check Completed Retaken Penalty
D6|Penalty|Check Completed Offside
E1|Mistaken Identity|Checking Possible Mistaken Identity
E2|Mistaken Identity|Checking Possible Red Card Mistaken
E3|Mistaken Identity|Checking Possible Yellow Card Mistaken
E4|Mistaken Identity|Check Completed Mistaken Identity
E5|Mistaken Identity|Check Completed No Mistaken Identity
F1|Any Incident|VAR Checking
F2|Any Incident|VAR Review
F3|Any Incident|VAR Completed
G1|Status|VAR Inactive
G2|Status|VAR Active
G3|Status|VAR Suspended
G4|Status|VAR Terminated
`);
}

function getShortcutHint(items) {
  if (!items.length) return "No shortcuts";
  const prefix = items[0].code.charAt(0);
  const numbers = items
    .map((item) => parseInt(item.code.slice(1), 10))
    .filter((number) => Number.isFinite(number));
  const max = Math.max(...numbers);
  return `Keys ${prefix}1-${prefix}${max}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "category";
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
      const modal = document.getElementById("customModal");
      if (modal) modal.classList.remove("show");
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

function bindControllerModals() {
  bindModal("openCustomModal", "customModal", "closeCustomModal", "customMessage");
  bindModal("openHistoryModal", "historyModal", "closeHistoryModal");
}

function bindModal(openId, modalId, closeId, focusId) {
  const openButton = document.getElementById(openId);
  const modal = document.getElementById(modalId);
  const closeButton = document.getElementById(closeId);
  if (!openButton || !modal || !closeButton) return;

  const closeModal = () => modal.classList.remove("show");
  const openModal = () => {
    modal.classList.add("show");
    if (focusId) {
      const focusTarget = document.getElementById(focusId);
      if (focusTarget) focusTarget.focus();
    }
  };

  openButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
}

function bindThemeSelect() {
  const select = document.getElementById("settingsThemeSelect");
  if (!select) return;

  select.value = getControllerTheme();
  select.addEventListener("change", () => {
    setControllerTheme(select.value);
    applyControllerTheme();
  });

  if (window.matchMedia) {
    const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (getControllerTheme() === "system") applyControllerTheme();
    };

    if (themeQuery.addEventListener) {
      themeQuery.addEventListener("change", handleSystemThemeChange);
    } else if (themeQuery.addListener) {
      themeQuery.addListener(handleSystemThemeChange);
    }
  }
}

function getControllerTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  return ["system", "dark", "light"].includes(theme) ? theme : "system";
}

function setControllerTheme(theme) {
  localStorage.setItem(THEME_KEY, ["system", "dark", "light"].includes(theme) ? theme : "system");
}

function applyControllerTheme() {
  const selectedTheme = getControllerTheme();
  const resolvedTheme = selectedTheme === "system" ? getSystemTheme() : selectedTheme;
  document.body.dataset.theme = resolvedTheme;
}

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

function bindMessageToggle() {
  const settingsButton = document.getElementById("settingsButton");
  const button = document.getElementById("settingsMessageToggle");
  const modal = document.getElementById("settingsModal");
  const closeBtn = document.getElementById("closeSettings");
  const backgroundInput = document.getElementById("settingsBackgroundInput");
  const imageFormatSelect = document.getElementById("settingsImageFormatSelect");
  if (!button || !modal) return;

  renderMessageToggle(button, getMessageVisibility());
  renderImageFormatSelect(imageFormatSelect);
  renderSettingsLinks();

  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      renderMessageToggle(button, getMessageVisibility());
      renderImageFormatSelect(imageFormatSelect);
      if (backgroundInput) backgroundInput.value = getMatchBackground();
      renderSettingsLinks();
      modal.classList.add("show");
    });
  }

  button.addEventListener("click", () => {
    const nextValue = !getMessageVisibility();
    setMessageVisibility(nextValue);
    renderMessageToggle(button, nextValue);

    const latestStatus = getLatestStatus();
    if (latestStatus) {
      const updatedStatus = {
        ...latestStatus,
        showMessage: nextValue,
        background: getMatchBackground(),
        imageFormat: getStatusImageFormat(),
        matchId: currentMatchId,
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
        background: getMatchBackground(),
        imageFormat: getStatusImageFormat(),
        matchId: currentMatchId,
        time: Date.now()
      };
      saveLatestStatus(standbyStatus);
      publishStatus(standbyStatus);
    }

    showToast(nextValue ? "Viewer Message Shown" : "Viewer Message Hidden");
  });

  if (backgroundInput) {
    backgroundInput.value = getMatchBackground();
    backgroundInput.addEventListener("change", () => {
      const nextBackground = normalizeBackgroundPath(backgroundInput.value, true);
      setMatchBackground(nextBackground);
      backgroundInput.value = nextBackground;

      const latestStatus = getLatestStatus() || {
        code: "STANDBY",
        text: "STANDBY",
        color: "black",
        showMessage: getMessageVisibility(),
        background: getMatchBackground(),
        imageFormat: getStatusImageFormat(),
        time: Date.now()
      };

      const updatedStatus = {
        ...latestStatus,
        background: nextBackground,
        matchId: currentMatchId,
        time: Date.now()
      };

      saveLatestStatus(updatedStatus);
      publishStatus(updatedStatus)
        .then(() => showToast(`${getMatchLabel(currentMatchId)} Background Updated`))
        .catch((error) => {
          console.error("Unable to update match background:", error);
          showToast("Background Update Failed");
        });
    });
  }

  if (imageFormatSelect) {
    imageFormatSelect.addEventListener("change", () => {
      const nextFormat = normalizeStatusImageFormat(imageFormatSelect.value);
      setStatusImageFormat(nextFormat);
      imageFormatSelect.value = nextFormat;

      const latestStatus = getLatestStatus() || {
        code: "STANDBY",
        text: "STANDBY",
        color: "black",
        showMessage: getMessageVisibility(),
        background: getMatchBackground(),
        imageFormat: getStatusImageFormat(),
        time: Date.now()
      };

      const updatedStatus = {
        ...latestStatus,
        imageFormat: nextFormat,
        matchId: currentMatchId,
        time: Date.now()
      };

      saveLatestStatus(updatedStatus);
      publishStatus(updatedStatus)
        .then(() => showToast(`Code Images: ${nextFormat.toUpperCase()}`))
        .catch((error) => {
          console.error("Unable to update image format:", error);
          showToast("Image Format Update Failed");
        });
    });
  }

  closeBtn.addEventListener("click", () => modal.classList.remove("show"));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.remove("show");
  });
}

function bindLogoutButton() {
  const button = document.getElementById("logoutButton");
  if (!button) return;

  button.addEventListener("click", () => {
    localStorage.removeItem(AUTH_KEY);
    window.location.replace("login.html");
  });
}

function renderMessageToggle(button, showMessage) {
  button.textContent = showMessage ? "HIDE MESSAGE" : "SHOW MESSAGE";
  button.setAttribute("aria-pressed", String(showMessage));
  button.classList.toggle("is-hidden", !showMessage);
}

function renderImageFormatSelect(select) {
  if (select) {
    select.value = getStatusImageFormat();
  }
}

function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && closeOpenModal()) {
      event.preventDefault();
      return;
    }

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

function closeOpenModal() {
  const modal = document.querySelector(".modal-overlay.show");
  if (!modal) return false;

  modal.classList.remove("show");
  return true;
}

function resolveShortcutCode(key) {
  if (/^[1-9]$/.test(key)) {
    const directCode = `A${key}`;
    return findStatusItem(directCode) ? directCode : "";
  }

  if (/^[A-Z]$/.test(key) && categories.some((category) => category.items.some((item) => item.code.startsWith(key)))) {
    pendingShortcutPrefix = key;
    clearTimeout(pendingShortcutTimer);
    pendingShortcutTimer = setTimeout(() => {
      pendingShortcutPrefix = "";
    }, 1200);
    return "";
  }

  if (pendingShortcutPrefix && /^[1-9]$/.test(key)) {
    const code = `${pendingShortcutPrefix}${key}`;
    pendingShortcutPrefix = "";
    clearTimeout(pendingShortcutTimer);
    return findStatusItem(code) ? code : "";
  }

  return "";
}

function findStatusItem(code) {
  return categories
    .flatMap((category) => category.items)
    .find((item) => item.code === code);
}

function handleSend(data, sourceButton) {
  animateButton(sourceButton);
  renderLastSent(data);
  addToHistory(data);

  return sendLocalStatus(data)
    .then(() => {
      showToast(data.text || data.code || "Viewer Updated");
    })
    .catch((error) => {
      console.error("Unable to update VAR viewer:", error);
      const message = error && error.message ? error.message : "Viewer Update Failed";
      showToast(message.includes("PERMISSION_DENIED") ? "Firebase Permission Denied" : "Viewer Update Failed");
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
  const modeText = db ? "Firebase Connected" : "Firebase Not Loaded";

  status.textContent = db && isOnline ? modeText : db ? "Firebase Offline" : modeText;
  dot.classList.toggle("online", Boolean(db && isOnline));
  dot.classList.toggle("offline", !db || !isOnline);
}

function monitorConnection() {
  const db = getFirebaseDb();
  if (!db) {
    renderConnectionStatus(false);
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

function renderMatchSelector() {
  const strip = document.getElementById("matchStrip");
  if (!strip) return;

  strip.innerHTML = "";

  const input = document.createElement("input");
  input.className = "match-input";
  input.type = "text";
  input.inputMode = "numeric";
  input.pattern = "[0-9]{1,3}";
  input.maxLength = 3;
  input.value = currentMatchNumber;
  input.setAttribute("aria-label", "Match number");
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 3);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      goToMatchNumber(input.value);
    }
  });
  input.addEventListener("change", () => {
    goToMatchNumber(input.value);
  });

  const viewerButton = document.createElement("button");
  viewerButton.className = "viewer-open-button";
  viewerButton.type = "button";
  viewerButton.textContent = "OPEN VIEWER";
  viewerButton.addEventListener("click", () => {
    window.open(buildPageUrl("viewer.html", currentMatchId), "_blank", "noopener");
  });

  strip.appendChild(input);
  strip.appendChild(viewerButton);
}

function renderMatchIdentity() {
  const subtitle = document.getElementById("controllerSubtitle");
  if (subtitle) {
    subtitle.textContent = `Controller - ${getMatchLabel(currentMatchId)}`;
  }

  document.title = `VAR Information System - ${getMatchLabel(currentMatchId)} Controller`;
}

function renderSettingsLinks() {
  const controllerLink = document.getElementById("controllerMatchLink");
  const viewerLink = document.getElementById("viewerMatchLink");

  if (controllerLink) {
    controllerLink.href = buildPageUrl("controller.html", currentMatchId);
    controllerLink.textContent = `${getMatchLabel(currentMatchId)} Controller`;
  }

  if (viewerLink) {
    viewerLink.href = buildPageUrl("viewer.html", currentMatchId);
    viewerLink.textContent = `${getMatchLabel(currentMatchId)} Viewer`;
  }
}

function renderMiniViewer() {
  const frame = document.getElementById("miniViewerFrame");
  if (frame) {
    frame.src = buildPageUrl("viewer.html", currentMatchId);
  }
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

  setText("lastCode", code);
  setText("lastMessage", text);
  setText("lastTime", time);

  const colorIndicator = document.getElementById("lastColor");
  if (colorIndicator) {
    colorIndicator.style.background = color;
  }

}

function addToHistory(data) {
  const history = getHistory();
  const nextHistory = [data, ...history].slice(0, 10);
  localStorage.setItem(getScopedKey(HISTORY_KEY), JSON.stringify(nextHistory));
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
  document.title = `VAR Information System - ${getMatchLabel(currentMatchId)} Viewer`;
  document.body.style.backgroundImage = `url("${getMatchBackground()}"), url("${DEFAULT_BACKGROUND}")`;

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
  const image = document.getElementById("viewerImage");
  if (!message) return;

  const displayText = data.text || "";
  const imageFormat = normalizeStatusImageFormat(data.imageFormat || getStatusImageFormat());
  if (data.imageFormat) setStatusImageFormat(imageFormat);
  const imageFile = getStatusImageFileName(data.code, imageFormat);
  const showMessage = typeof data.showMessage === "boolean" ? data.showMessage : getMessageVisibility();
  const isClear = String(data.code || "").toUpperCase() === "CLEAR";
  const matchBackground = normalizeBackgroundPath(data.background || getMatchBackground());
  if (data.background) setMatchBackground(matchBackground);
  const backgroundFile = isClear ? getStatusImageFileName("CLEAR") : showMessage ? matchBackground : imageFile;

  if (image) {
    image.style.display = "none";
  }
  message.innerHTML = formatMessageText(displayText || "STANDBY");
  message.style.display = (showMessage && !isClear) ? "block" : "none";
  document.body.style.backgroundImage = `url("${backgroundFile}"), url("${DEFAULT_BACKGROUND}")`;

  message.style.animation = "none";
  void message.offsetWidth;
  message.style.animation = "";
}

async function renderViewerImage(fileName) {
  const message = document.getElementById("viewerMessage");
  const image = document.getElementById("viewerImage");
  if (!image || !message) return;

  const imagePath = resolveViewerImagePath(fileName);
  image.src = imagePath;
  image.style.display = "block";
  message.style.display = "none";

  const matchBackground = getMatchBackground();
  const bgExists = await checkImageExists(matchBackground);
  document.body.style.backgroundImage = bgExists ? `url("${imagePath}"), url("${matchBackground}")` : `url("${imagePath}")`;
}

function resolveViewerImagePath(fileName) {
  const requestedFile = String(fileName || "").trim();
  if (requestedFile.includes("/") || requestedFile.includes("\\")) {
    return requestedFile;
  }

  const format = getStatusImageFormat();
  const code = requestedFile.replace(/\.(png|jpg|jpeg)$/i, "").toUpperCase();
  return getStatusImageFileName(code, format);
}

function checkImageExists(fileName) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = fileName;
  });
}

function saveLatestStatus(data) {
  localStorage.setItem(getScopedKey(LAST_STATUS_KEY), JSON.stringify(data));
}

function getMessageVisibility() {
  return localStorage.getItem(getScopedKey(MESSAGE_VISIBILITY_KEY)) !== "false";
}

function setMessageVisibility(showMessage) {
  localStorage.setItem(getScopedKey(MESSAGE_VISIBILITY_KEY), String(showMessage));
}

function getStatusImageFormat() {
  return normalizeStatusImageFormat(localStorage.getItem(getScopedKey(STATUS_IMAGE_FORMAT_KEY)));
}

function setStatusImageFormat(format) {
  localStorage.setItem(getScopedKey(STATUS_IMAGE_FORMAT_KEY), normalizeStatusImageFormat(format));
}

function normalizeStatusImageFormat(format) {
  const normalizedFormat = String(format || "").trim().toLowerCase();
  return normalizedFormat === "jpg" ? "jpg" : DEFAULT_STATUS_IMAGE_FORMAT;
}

function getLatestStatus() {
  try {
    return JSON.parse(localStorage.getItem(getScopedKey(LAST_STATUS_KEY))) || null;
  } catch (error) {
    return null;
  }
}

function getHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(getScopedKey(HISTORY_KEY)));
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

function getCurrentMatchId() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("match") || params.get("m") || window.location.hash.replace("#", "");
  const normalized = normalizeMatchId(requested);
  return normalized || DEFAULT_MATCH_ID;
}

function normalizeMatchId(value) {
  const raw = String(value || "").trim().toLowerCase();
  const numeric = raw.match(/^\d{1,3}$/);
  if (numeric) return `match-${normalizeMatchNumber(numeric[0])}`;
  const named = raw.match(/^match-(\d{1,3})$/);
  if (named) return `match-${normalizeMatchNumber(named[1])}`;
  return DEFAULT_MATCH_ID;
}

function getMatchLabel(matchId) {
  return `Match ${getMatchNumber(matchId)}`;
}

function getMatchNumber(matchId) {
  const match = String(matchId || "").match(/^match-(\d{1,3})$/);
  return match ? normalizeMatchNumber(match[1]) : DEFAULT_MATCH_NUMBER;
}

function normalizeMatchNumber(value) {
  const number = parseInt(String(value || "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(number) || number < 1) return DEFAULT_MATCH_NUMBER;
  return String(Math.min(number, 999));
}

function getScopedKey(key) {
  return `${key}:${currentMatchId}`;
}

function getFirebaseStatusPath() {
  return `${FIREBASE_STATUSES_PATH}/${currentMatchId}`;
}

function getMatchBackground() {
  return normalizeBackgroundPath(localStorage.getItem(getScopedKey(MATCH_BACKGROUND_KEY)), true);
}

function setMatchBackground(background) {
  localStorage.setItem(getScopedKey(MATCH_BACKGROUND_KEY), normalizeBackgroundPath(background, true));
}

function normalizeBackgroundPath(value, useMatchDefault = false) {
  const path = String(value || "").trim();
  return path || (useMatchDefault ? getDefaultMatchBackground() : DEFAULT_BACKGROUND);
}

function buildPageUrl(page, matchId) {
  return `${page}?match=${encodeURIComponent(getMatchNumber(matchId))}`;
}

function goToMatchNumber(value) {
  const matchId = normalizeMatchId(value);
  if (matchId !== currentMatchId) {
    window.location.href = buildPageUrl("controller.html", matchId);
  }
}

function getDefaultMatchBackground() {
  if (currentMatchNumber === DEFAULT_MATCH_NUMBER) {
    return DEFAULT_BACKGROUND;
  }

  return `bg-match-${currentMatchNumber}.png`;
}
