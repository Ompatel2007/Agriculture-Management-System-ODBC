const byId = (id) => document.getElementById(id);

// --- Core Database Definition & Seed Data ---
const CORE_COLUMNS = [
    { name: "FARMER_ID", type: "NUMBER", definition: "NUMBER", protected: true },
    { name: "NAME", type: "VARCHAR2", definition: "VARCHAR2(100)", protected: true },
    { name: "GENDER", type: "CHAR", definition: "CHAR(10)", protected: true },
    { name: "PHONE", type: "VARCHAR2", definition: "VARCHAR2(15)", protected: true },
    { name: "CROP_NAME", type: "VARCHAR2", definition: "VARCHAR2(100)", protected: true },
    { name: "CROP_VOL", type: "NUMBER", definition: "NUMBER(10,2)", protected: true },
    { name: "PRICE", type: "NUMBER", definition: "NUMBER(10,2)", protected: true },
    { name: "TOTAL_VALUE", type: "NUMBER", definition: "NUMBER(12,2)", protected: true },
    { name: "PRODUCTION_LEVEL", type: "VARCHAR2", definition: "VARCHAR2(10)", protected: true },
    { name: "FARMER_STATUS", type: "VARCHAR2", definition: "VARCHAR2(10)", protected: true }
];

const CORE_COLUMN_NAMES = new Set(CORE_COLUMNS.map(c => c.name));

const SEED_RECORDS = [
    {
        row_id: "ROW_101_1",
        farmer_id: 101,
        name: "Om",
        gender: "M",
        phone: "9876543210",
        crop_name: "Cotton",
        crop_vol: 600,
        price: 40,
        total_value: 24000,
        production_level: "MEDIUM",
        farmer_status: "ACTIVE"
    },
    {
        row_id: "ROW_102_1",
        farmer_id: 102,
        name: "Arun",
        gender: "M",
        phone: "9876501234",
        crop_name: "Rice",
        crop_vol: 450,
        price: 35,
        total_value: 15750,
        production_level: "LOW",
        farmer_status: "INACTIVE"
    },
    {
        row_id: "ROW_103_1",
        farmer_id: 103,
        name: "Ananya",
        gender: "F",
        phone: "9812345678",
        crop_name: "Wheat",
        crop_vol: 1200,
        price: 30,
        total_value: 36000,
        production_level: "HIGH",
        farmer_status: "ACTIVE"
    },
    {
        row_id: "ROW_104_1",
        farmer_id: 104,
        name: "Ramesh",
        gender: "M",
        phone: "9823456789",
        crop_name: "Sugarcane",
        crop_vol: 850,
        price: 28,
        total_value: 23800,
        production_level: "MEDIUM",
        farmer_status: "ACTIVE"
    },
    {
        row_id: "ROW_105_1",
        farmer_id: 105,
        name: "Priya",
        gender: "F",
        phone: "9834567890",
        crop_name: "Maize",
        crop_vol: 320,
        price: 45,
        total_value: 14400,
        production_level: "LOW",
        farmer_status: "INACTIVE"
    }
];

// --- Local Browser Database Implementation ---
const LocalDB = {
    KEYS: {
        RECORDS: "ams_records",
        COLUMNS: "ams_columns"
    },

    init() {
        try {
            const storedRecords = localStorage.getItem(this.KEYS.RECORDS);
            if (!storedRecords || JSON.parse(storedRecords).length === 0) {
                this.setRecords(SEED_RECORDS);
            }
        } catch {
            this.setRecords(SEED_RECORDS);
        }

        try {
            const storedColumns = localStorage.getItem(this.KEYS.COLUMNS);
            if (!storedColumns || JSON.parse(storedColumns).length === 0) {
                this.setColumns(CORE_COLUMNS);
            }
        } catch {
            this.setColumns(CORE_COLUMNS);
        }
    },

    getRecordsList() {
        try {
            const raw = localStorage.getItem(this.KEYS.RECORDS);
            if (!raw) {
                this.setRecords(SEED_RECORDS);
                return JSON.parse(JSON.stringify(SEED_RECORDS));
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                this.setRecords(SEED_RECORDS);
                return JSON.parse(JSON.stringify(SEED_RECORDS));
            }
            return parsed;
        } catch {
            this.setRecords(SEED_RECORDS);
            return JSON.parse(JSON.stringify(SEED_RECORDS));
        }
    },

    setRecords(records) {
        localStorage.setItem(this.KEYS.RECORDS, JSON.stringify(records));
    },

    getColumnsList() {
        try {
            const raw = localStorage.getItem(this.KEYS.COLUMNS);
            if (!raw) {
                this.setColumns(CORE_COLUMNS);
                return JSON.parse(JSON.stringify(CORE_COLUMNS));
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                this.setColumns(CORE_COLUMNS);
                return JSON.parse(JSON.stringify(CORE_COLUMNS));
            }
            return parsed;
        } catch {
            this.setColumns(CORE_COLUMNS);
            return JSON.parse(JSON.stringify(CORE_COLUMNS));
        }
    },

    setColumns(columns) {
        localStorage.setItem(this.KEYS.COLUMNS, JSON.stringify(columns));
    },

    getDynamicColumns() {
        const cols = this.getColumnsList();
        return cols.filter(c => !c.protected).map(c => c.name);
    },

    calcProductionLevel(vol) {
        const v = Number(vol) || 0;
        if (v < 500) return "LOW";
        if (v <= 1000) return "MEDIUM";
        return "HIGH";
    },

    calcFarmerStatus(records, farmerId) {
        const fid = Number(farmerId);
        const total = records
            .filter(r => Number(r.farmer_id) === fid)
            .reduce((sum, r) => sum + (Number(r.crop_vol) || 0), 0);
        return {
            total,
            status: total >= 500 ? "ACTIVE" : "INACTIVE"
        };
    },

    recalcAndSyncFarmer(records, farmerId, newInfo = null) {
        const fid = Number(farmerId);
        const { total, status } = this.calcFarmerStatus(records, fid);
        records.forEach(r => {
            if (Number(r.farmer_id) === fid) {
                r.farmer_status = status;
                if (newInfo) {
                    if (newInfo.name) r.name = newInfo.name;
                    if (newInfo.gender) r.gender = newInfo.gender;
                    if (newInfo.phone !== undefined) r.phone = newInfo.phone;
                }
            }
        });
        return { total, status };
    },

    // --- Authentication ---
    login(username, password) {
        const u = String(username || "").trim();
        const p = String(password || "").trim();
        if (!u || !p) {
            throw new Error("Enter a username and password.");
        }
        if (u.toLowerCase() === "admin" && p === "admin999") {
            return {
                success: true,
                role: "admin",
                username: "admin",
                message: "Admin login successful."
            };
        }
        if (u.toLowerCase() === p.toLowerCase()) {
            const records = this.getRecordsList();
            const match = records.find(r => String(r.name).trim().toLowerCase() === u.toLowerCase());
            if (match) {
                return {
                    success: true,
                    role: "farmer",
                    username: match.name,
                    message: "Farmer login successful."
                };
            }
        }
        throw new Error("Invalid username or password.");
    },

    // --- DML: Records ---
    getRecords(role, username) {
        const records = this.getRecordsList();
        const extraColumns = this.getDynamicColumns();

        if (role === "farmer") {
            const u = String(username || "").trim().toLowerCase();
            const filtered = records
                .filter(r => String(r.name).trim().toLowerCase() === u)
                .map(r => ({
                    row_id: r.row_id,
                    farmer_id: r.farmer_id,
                    name: r.name,
                    gender: r.gender,
                    phone: r.phone,
                    crop_name: r.crop_name,
                    crop_vol: r.crop_vol,
                    price: r.price,
                    total_value: r.total_value,
                    production_level: r.production_level,
                    farmer_status: r.farmer_status
                }));
            return {
                success: true,
                records: filtered,
                extra_columns: [],
                role: "farmer"
            };
        }

        const enriched = records.map(r => {
            const rec = { ...r };
            extraColumns.forEach(col => {
                if (rec[col] === undefined) {
                    rec[col] = null;
                }
            });
            return rec;
        });

        return {
            success: true,
            records: enriched,
            extra_columns: extraColumns,
            role: "admin"
        };
    },

    saveRecord(data) {
        const farmer_id = parseInt(data.farmer_id, 10);
        const name = String(data.name || "").trim();
        const gender = String(data.gender || "").trim().toUpperCase();
        const phone = String(data.phone || "").trim() || null;
        const crop_name = String(data.crop_name || "").trim();
        const crop_vol = parseFloat(data.crop_vol);
        const price = parseFloat(data.price);

        if (isNaN(farmer_id) || farmer_id <= 0) {
            throw new Error("Farmer ID must be a positive number.");
        }
        if (!name || !crop_name) {
            throw new Error("Farmer name and crop name are required.");
        }
        if (gender !== "M" && gender !== "F") {
            throw new Error("Select M or F for gender.");
        }
        if (isNaN(crop_vol) || isNaN(price) || crop_vol < 0 || price < 0) {
            throw new Error("Production quantity and price cannot be negative.");
        }

        const total_value = crop_vol * price;
        const production_level = this.calcProductionLevel(crop_vol);

        const records = this.getRecordsList();
        const extraColumns = this.getDynamicColumns();

        const newRec = {
            row_id: "ROW_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            farmer_id,
            name,
            gender,
            phone,
            crop_name,
            crop_vol,
            price,
            total_value,
            production_level,
            farmer_status: "INACTIVE"
        };

        const extraFields = data.extra_fields || {};
        extraColumns.forEach(col => {
            const val = extraFields[col] !== undefined ? extraFields[col] : data[col];
            newRec[col] = (val !== undefined && val !== "" && val !== null) ? val : null;
        });

        records.push(newRec);

        const { total: total_production, status } = this.recalcAndSyncFarmer(
            records, farmer_id, { name, gender, phone }
        );

        this.setRecords(records);

        return {
            message: "Crop record added successfully.",
            total_value,
            production_level,
            farmer_status: status,
            total_production
        };
    },

    updateRecord(data) {
        const row_id = String(data.row_id || "").trim();
        if (!row_id) {
            throw new Error("Missing row identifier. Select a record to update.");
        }

        const farmer_id = parseInt(data.farmer_id, 10);
        const name = String(data.name || "").trim();
        const gender = String(data.gender || "").trim().toUpperCase();
        const phone = String(data.phone || "").trim() || null;
        const crop_name = String(data.crop_name || "").trim();
        const crop_vol = parseFloat(data.crop_vol);
        const price = parseFloat(data.price);

        if (isNaN(farmer_id) || farmer_id <= 0) {
            throw new Error("Farmer ID must be a positive number.");
        }
        if (!name || !crop_name) {
            throw new Error("Farmer name and crop name are required.");
        }
        if (gender !== "M" && gender !== "F") {
            throw new Error("Select M or F for gender.");
        }
        if (isNaN(crop_vol) || isNaN(price) || crop_vol < 0 || price < 0) {
            throw new Error("Production quantity and price cannot be negative.");
        }

        const total_value = crop_vol * price;
        const production_level = this.calcProductionLevel(crop_vol);

        const records = this.getRecordsList();
        const recIndex = records.findIndex(r => r.row_id === row_id);
        if (recIndex === -1) {
            throw new Error("That record no longer exists. Refresh and try again.");
        }

        const old_farmer_id = records[recIndex].farmer_id;
        const extraColumns = this.getDynamicColumns();
        const extraFields = data.extra_fields || {};

        records[recIndex].farmer_id = farmer_id;
        records[recIndex].name = name;
        records[recIndex].gender = gender;
        records[recIndex].phone = phone;
        records[recIndex].crop_name = crop_name;
        records[recIndex].crop_vol = crop_vol;
        records[recIndex].price = price;
        records[recIndex].total_value = total_value;
        records[recIndex].production_level = production_level;

        extraColumns.forEach(col => {
            if (extraFields[col] !== undefined) {
                const val = extraFields[col];
                records[recIndex][col] = (val !== null && val !== "") ? val : null;
            } else if (data[col] !== undefined) {
                const val = data[col];
                records[recIndex][col] = (val !== null && val !== "") ? val : null;
            }
        });

        this.recalcAndSyncFarmer(records, farmer_id, { name, gender, phone });
        if (old_farmer_id !== farmer_id) {
            this.recalcAndSyncFarmer(records, old_farmer_id);
        }

        const { status: new_status } = this.calcFarmerStatus(records, farmer_id);

        this.setRecords(records);

        return {
            message: "Record updated successfully.",
            total_value,
            production_level,
            farmer_status: new_status
        };
    },

    deleteRecord(rowId) {
        const records = this.getRecordsList();
        const recIndex = records.findIndex(r => r.row_id === rowId);
        if (recIndex === -1) {
            throw new Error("Record not found. Refresh the table and try again.");
        }

        const farmer_id = records[recIndex].farmer_id;
        records.splice(recIndex, 1);

        this.recalcAndSyncFarmer(records, farmer_id);
        this.setRecords(records);

        return {
            message: "Crop record deleted successfully."
        };
    },

    // --- DDL: Columns ---
    getColumns() {
        return this.getColumnsList();
    },

    addColumn(rawName, type, size) {
        const name = String(rawName || "").trim().toUpperCase();
        if (!/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(name)) {
            throw new Error("Use a valid column name (letters, numbers and underscores; start with a letter).");
        }

        const columns = this.getColumnsList();
        if (columns.some(c => c.name === name)) {
            throw new Error(`Column ${name} already exists.`);
        }

        const allowed = ["VARCHAR2", "CHAR", "NUMBER", "DATE"];
        const upperType = (type || "").toUpperCase();
        if (!allowed.includes(upperType)) {
            throw new Error("Unsupported datatype.");
        }

        let definition = upperType;
        if (upperType === "VARCHAR2" || upperType === "CHAR") {
            const s = parseInt(size, 10);
            if (isNaN(s) || s < 1 || s > 4000) {
                throw new Error("Size must be between 1 and 4000.");
            }
            definition = `${upperType}(${s})`;
        } else if (upperType === "NUMBER") {
            if (size !== undefined && size !== null && String(size).trim() !== "") {
                const p = parseInt(size, 10);
                if (isNaN(p) || p < 1 || p > 38) {
                    throw new Error("NUMBER precision must be between 1 and 38.");
                }
                definition = `NUMBER(${p})`;
            }
        }

        columns.push({
            name,
            type: upperType,
            definition,
            protected: false
        });

        const records = this.getRecordsList();
        records.forEach(r => {
            r[name] = null;
        });

        this.setColumns(columns);
        this.setRecords(records);

        return {
            success: true,
            message: `Column ${name} added successfully.`
        };
    },

    modifyColumn(rawName, type, size) {
        const name = String(rawName || "").trim().toUpperCase();
        if (CORE_COLUMN_NAMES.has(name)) {
            throw new Error("Changing core application columns is disabled.");
        }

        const columns = this.getColumnsList();
        const col = columns.find(c => c.name === name);
        if (!col) {
            throw new Error(`Column ${name} does not exist.`);
        }

        const upperType = (type || "").toUpperCase();
        let definition = upperType;
        if (upperType === "VARCHAR2" || upperType === "CHAR") {
            const s = parseInt(size, 10);
            if (isNaN(s) || s < 1 || s > 4000) {
                throw new Error("Size must be between 1 and 4000.");
            }
            definition = `${upperType}(${s})`;
        } else if (upperType === "NUMBER") {
            if (size !== undefined && size !== null && String(size).trim() !== "") {
                const p = parseInt(size, 10);
                if (isNaN(p) || p < 1 || p > 38) {
                    throw new Error("NUMBER precision must be between 1 and 38.");
                }
                definition = `NUMBER(${p})`;
            }
        }

        col.type = upperType;
        col.definition = definition;

        this.setColumns(columns);

        return {
            success: true,
            message: `Column ${name} modified to ${definition}.`
        };
    },

    renameColumn(oldRaw, newRaw) {
        const oldName = String(oldRaw || "").trim().toUpperCase();
        const newName = String(newRaw || "").trim().toUpperCase();

        if (!/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(oldName) || !/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(newName)) {
            throw new Error("Enter valid old and new column names.");
        }
        if (CORE_COLUMN_NAMES.has(oldName)) {
            throw new Error("Renaming core application columns is disabled.");
        }
        if (oldName === newName) {
            throw new Error("The new name must be different.");
        }

        const columns = this.getColumnsList();
        const col = columns.find(c => c.name === oldName);
        if (!col) {
            throw new Error(`Column ${oldName} does not exist.`);
        }
        if (columns.some(c => c.name === newName)) {
            throw new Error(`Column ${newName} already exists.`);
        }

        col.name = newName;

        const records = this.getRecordsList();
        records.forEach(r => {
            r[newName] = r[oldName] !== undefined ? r[oldName] : null;
            delete r[oldName];
        });

        this.setColumns(columns);
        this.setRecords(records);

        return {
            success: true,
            message: `Column renamed from ${oldName} to ${newName}.`
        };
    },

    deleteColumn(rawName) {
        const name = String(rawName || "").trim().toUpperCase();
        if (!/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(name)) {
            throw new Error("Invalid column name.");
        }
        if (CORE_COLUMN_NAMES.has(name)) {
            throw new Error("Deleting pre-loaded application columns is disabled.");
        }

        let columns = this.getColumnsList();
        if (!columns.some(c => c.name === name)) {
            throw new Error(`Column ${name} does not exist.`);
        }

        columns = columns.filter(c => c.name !== name);

        const records = this.getRecordsList();
        records.forEach(r => {
            delete r[name];
        });

        this.setColumns(columns);
        this.setRecords(records);

        return {
            success: true,
            message: `Column ${name} deleted successfully.`
        };
    }
};

// Initialize LocalDB
LocalDB.init();

function mockResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: status >= 200 && status < 300 ? "OK" : "Error",
        json: async () => data,
        text: async () => JSON.stringify(data)
    };
}

function handleLocalRequest(url, options = {}) {
    LocalDB.init();

    const method = (options.method || "GET").toUpperCase();
    let body = {};
    if (options.body) {
        try {
            body = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
        } catch {
            body = {};
        }
    }

    const cleanUrl = url.split("?")[0];

    try {
        if (cleanUrl === "/api/login" && method === "POST") {
            const res = LocalDB.login(body.username, body.password);
            return mockResponse(200, res);
        }

        if (cleanUrl === "/api/logout" && method === "POST") {
            sessionStorage.removeItem("loggedIn");
            sessionStorage.removeItem("role");
            sessionStorage.removeItem("username");
            return mockResponse(200, { success: true, redirect: "/" });
        }

        if (cleanUrl === "/records" && method === "GET") {
            const role = sessionStorage.getItem("role");
            if (!role || !sessionStorage.getItem("loggedIn")) {
                return mockResponse(401, { success: false, message: "Please log in first." });
            }
            const username = sessionStorage.getItem("username") || "admin";
            const res = LocalDB.getRecords(role, username);
            return mockResponse(200, res);
        }

        if (cleanUrl === "/save" && method === "POST") {
            const res = LocalDB.saveRecord(body);
            return mockResponse(201, res);
        }

        if (cleanUrl === "/update" && method === "PUT") {
            const res = LocalDB.updateRecord(body);
            return mockResponse(200, res);
        }

        if (cleanUrl.startsWith("/delete/") && method === "DELETE") {
            const rowId = decodeURIComponent(cleanUrl.replace("/delete/", ""));
            const res = LocalDB.deleteRecord(rowId);
            return mockResponse(200, res);
        }

        if (cleanUrl === "/api/columns" && method === "GET") {
            const res = LocalDB.getColumns();
            return mockResponse(200, { success: true, columns: res });
        }

        if (cleanUrl === "/api/columns" && method === "POST") {
            const res = LocalDB.addColumn(body.name, body.type, body.size);
            return mockResponse(200, res);
        }

        if (cleanUrl === "/api/columns/modify" && method === "POST") {
            const res = LocalDB.modifyColumn(body.name, body.type, body.size);
            return mockResponse(200, res);
        }

        if (cleanUrl === "/api/columns/rename" && method === "POST") {
            const res = LocalDB.renameColumn(body.old_name, body.new_name);
            return mockResponse(200, res);
        }

        if (cleanUrl === "/api/columns/delete" && (method === "POST" || method === "DELETE")) {
            const res = LocalDB.deleteColumn(body.name);
            return mockResponse(200, res);
        }

        return mockResponse(404, { success: false, message: "Endpoint not found." });

    } catch (err) {
        return mockResponse(400, { success: false, message: err.message, error: err.message });
    }
}

let isLocalMode = sessionStorage.getItem("ams_local_mode") === "true";

async function fetchWithTimeout(url, options = {}, timeoutMs = 2000) {
    if (isLocalMode) {
        return handleLocalRequest(url, options);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        if (response.status === 404 || response.status === 502 || response.status === 503) {
            isLocalMode = true;
            sessionStorage.setItem("ams_local_mode", "true");
            return handleLocalRequest(url, options);
        }

        return response;
    } catch {
        isLocalMode = true;
        sessionStorage.setItem("ams_local_mode", "true");
        return handleLocalRequest(url, options);
    } finally {
        clearTimeout(timeoutId);
    }
}

async function readJsonResponse(response) {
    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            `Server returned an unreadable response (HTTP ${response.status}).`
        );
    }

    if (!response.ok) {
        throw new Error(
            result.message || result.error || `Request failed (HTTP ${response.status}).`
        );
    }

    return result;
}

let availableColumnMeta = [];
let currentExtraColumns = [];

document.addEventListener("DOMContentLoaded", () => {

    // --- Check if on Login Page ---
    const loginForm = byId("loginForm");
    if (loginForm) {
        LocalDB.init();

        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const message = byId("loginMessage");
            const submitBtn = loginForm.querySelector("button[type='submit']");
            if (submitBtn) submitBtn.disabled = true;
            if (message) {
                message.textContent = "";
                message.className = "message";
            }

            try {
                const username = byId("username").value.trim();
                const password = byId("password").value;

                const response = await fetchWithTimeout("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const result = await readJsonResponse(response);

                if (!result.success) {
                    throw new Error(result.error || result.message || "Login failed.");
                }

                sessionStorage.setItem("loggedIn", "true");
                sessionStorage.setItem("role", result.role);
                sessionStorage.setItem("username", result.username || username);

                const target = window.location.pathname.endsWith(".html") ? "index.html" : "/agriculture";
                window.location.replace(target);

            } catch (error) {
                if (message) {
                    message.textContent = error.message;
                    message.className = "message error";
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
        return;
    }

    // --- On Dashboard Page (index.html) ---
    const form = byId("recordForm");
    const tbody = byId("recordsTableBody");
    const table = tbody ? tbody.closest("table") : null;
    let role = null;
    let isAdmin = false;

    // Check login for local mode
    if (!sessionStorage.getItem("loggedIn") && isLocalMode) {
        const target = window.location.pathname.endsWith(".html") ? "login.html" : "/";
        window.location.replace(target);
        return;
    }

    // Hide the Actions column header for non-admin users.
    if (table) {
        const headerRow = table.querySelector("thead tr");
        if (headerRow && headerRow.lastElementChild) {
            headerRow.lastElementChild.classList.toggle("hidden", !isAdmin);
        }
    }

    byId("logoutButton")?.addEventListener("click", async () => {
        try {
            await fetchWithTimeout("/api/logout", {
                method: "POST"
            });
        } finally {
            sessionStorage.removeItem("loggedIn");
            sessionStorage.removeItem("role");
            sessionStorage.removeItem("username");
            const target = window.location.pathname.endsWith(".html") ? "login.html" : "/";
            window.location.replace(target);
        }
    });

    byId("refreshButton")?.addEventListener("click", loadRecords);
    byId("cancelButton")?.addEventListener("click", () => resetForm());

    form?.addEventListener("submit", saveOrUpdateRecord);

    form?.addEventListener("reset", () => {
        setTimeout(() => {
            if (!byId("rowId").value) {
                updatePreview();
            }
        }, 0);
    });

    ["cropVol", "price"].forEach((id) => {
        byId(id)?.addEventListener("input", updatePreview);
    });

    window.loadRecords = loadRecords;

    function renderDynamicFormFields(extraColumns = []) {
        const container = byId("dynamicFormFields");
        if (!container) return;

        const currentVals = {};
        container.querySelectorAll("input").forEach(input => {
            const col = input.getAttribute("data-col-name");
            if (col) {
                currentVals[col] = input.value;
            }
        });

        container.replaceChildren();

        if (!isAdmin || !Array.isArray(extraColumns) || extraColumns.length === 0) {
            return;
        }

        extraColumns.forEach(col => {
            const label = document.createElement("label");
            label.className = "dynamic-col-field";

            const colMeta = Array.isArray(availableColumnMeta)
                ? availableColumnMeta.find(c => c.name === col)
                : null;

            const textSpan = document.createElement("span");
            textSpan.textContent = col;
            label.appendChild(textSpan);

            const input = document.createElement("input");
            input.id = `dyn_col_${col}`;
            input.name = `dyn_${col}`;
            input.setAttribute("data-col-name", col);

            if (colMeta && colMeta.type === "NUMBER") {
                input.type = "number";
                input.step = "any";
                input.placeholder = "Enter number";
            } else if (colMeta && colMeta.type === "DATE") {
                input.type = "date";
            } else {
                input.type = "text";
                input.placeholder = "Enter value";
            }

            if (currentVals[col] !== undefined) {
                input.value = currentVals[col];
            }

            label.appendChild(input);
            container.appendChild(label);
        });
    }

    window.renderDynamicFormFields = renderDynamicFormFields;

    function renderTableHeader(extraColumns = []) {
        const thead = table ? table.querySelector("thead") : null;
        if (!thead) return;

        let tr = thead.querySelector("tr");
        if (!tr) {
            tr = document.createElement("tr");
            thead.appendChild(tr);
        }

        tr.innerHTML = `
            <th>Farmer ID</th>
            <th>Name</th>
            <th>Gender</th>
            <th>Phone</th>
            <th>Crop</th>
            <th>Production</th>
            <th>Price/unit</th>
            <th>Total value</th>
            <th>Production level</th>
            <th>Farmer status</th>
        `;

        if (isAdmin && Array.isArray(extraColumns)) {
            extraColumns.forEach(col => {
                const th = document.createElement("th");
                th.textContent = col;
                tr.appendChild(th);
            });
        }

        const actionTh = document.createElement("th");
        actionTh.className = "action-header";
        actionTh.textContent = "Actions";
        if (!isAdmin) {
            actionTh.classList.add("hidden");
        }
        tr.appendChild(actionTh);
    }

    async function loadRecords() {
        if (!tbody) return;
        const colCount = table?.querySelectorAll("thead th")?.length || (isAdmin ? 11 : 10);
        tbody.innerHTML = `
            <tr>
                <td colspan="${colCount}" class="empty-cell">
                    Loading records…
                </td>
            </tr>
        `;

        byId("tableMessage").textContent = "";
        byId("tableMessage").className = "message";

        try {
            const response = await fetchWithTimeout("/records");

            if (response.status === 401) {
                const target = window.location.pathname.endsWith(".html") ? "login.html" : "/";
                window.location.replace(target);
                return;
            }

            const result = await readJsonResponse(response);
            const records = result.records;
            const extraColumns = Array.isArray(result.extra_columns) ? result.extra_columns : [];

            role = result.role;
            isAdmin = role === "admin";
            currentExtraColumns = extraColumns;

            if (!Array.isArray(records)) {
                throw new Error("Unexpected response: records must be an array.");
            }

            applyRolePermissions(role);
            if (isAdmin) {
                await loadColumns();
            }

            renderTableHeader(extraColumns);
            renderDynamicFormFields(extraColumns);

            tbody.replaceChildren();

            const totalCols = 10 + (isAdmin ? extraColumns.length + 1 : 0);

            if (records.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="${totalCols}" class="empty-cell">
                            No records yet. Add your first crop above.
                        </td>
                    </tr>
                `;
                return;
            }

            records.forEach((record) => {
                const row = document.createElement("tr");

                const values = [
                    record.farmer_id,
                    record.name,
                    record.gender === "M"
                        ? "Male"
                        : record.gender === "F"
                            ? "Female"
                            : record.gender,
                    record.phone || "—",
                    record.crop_name,
                    formatNumber(record.crop_vol),
                    formatCurrency(record.price),
                    formatCurrency(record.total_value),
                    record.production_level || "—",
                    record.farmer_status || "—"
                ];

                values.forEach((value, index) => {
                    const cell = document.createElement("td");

                    if (index === 8) {
                        cell.appendChild(
                            makeBadge(record.production_level, "level")
                        );
                    } else if (index === 9) {
                        cell.appendChild(
                            makeBadge(record.farmer_status, "status")
                        );
                    } else {
                        cell.textContent = value ?? "—";
                    }

                    row.appendChild(cell);
                });

                if (isAdmin && Array.isArray(extraColumns)) {
                    extraColumns.forEach(col => {
                        const cell = document.createElement("td");
                        const val = record[col] !== undefined
                            ? record[col]
                            : (record.extra_fields ? record.extra_fields[col] : null);

                        if (val === null || val === undefined || val === "") {
                            cell.textContent = "null";
                            cell.className = "null-value";
                        } else {
                            cell.textContent = String(val);
                        }

                        row.appendChild(cell);
                    });
                }

                if (isAdmin) {
                    const actions = document.createElement("td");
                    actions.className = "action-cell";

                    const editButton = document.createElement("button");
                    editButton.type = "button";
                    editButton.className = "button button-small button-light";
                    editButton.textContent = "Update";
                    editButton.addEventListener("click", () => startEdit(record));

                    const deleteButton = document.createElement("button");
                    deleteButton.type = "button";
                    deleteButton.className = "button button-small button-danger";
                    deleteButton.textContent = "Delete";
                    deleteButton.addEventListener("click", () => deleteRecord(record));

                    actions.append(editButton, deleteButton);
                    row.appendChild(actions);
                }

                tbody.appendChild(row);
            });

        } catch (error) {
            const errCols = table?.querySelectorAll("thead th")?.length || (isAdmin ? 11 : 10);
            tbody.innerHTML = `
                <tr>
                    <td colspan="${errCols}" class="empty-cell">
                        Could not load records.
                    </td>
                </tr>
            `;

            byId("tableMessage").textContent = error.message;
            byId("tableMessage").className = "message error";
        }
    }

    function makeBadge(value, type) {
        const badge = document.createElement("span");
        const safeValue = String(value || "unknown").toLowerCase();

        badge.className = `badge badge-${type} badge-${safeValue}`;
        badge.textContent = value || "—";

        return badge;
    }

    function applyRolePermissions(role) {
        const admin = role === "admin";

        // Hide the entire crop-entry panel from farmers.
        const recordForm = byId("recordForm");
        if (recordForm) {
            const panel = recordForm.closest(".panel");
            if (panel) {
                panel.classList.toggle("hidden", !admin);
            }
        }

        // Hide the entire Table Structure panel from farmers.
        const structureForm = byId("addColumnForm");
        if (structureForm) {
            const panel = structureForm.closest(".panel");
            if (panel) {
                panel.classList.toggle("hidden", !admin);
            }
        }

        // Hide the Actions header.
        const headerRow = table?.querySelector("thead tr");
        if (headerRow?.lastElementChild) {
            headerRow.lastElementChild.classList.toggle("hidden", !admin);
        }

        // Hide any existing Actions cells.
        if (table) {
            table.querySelectorAll(".action-cell").forEach(cell => {
                cell.classList.toggle("hidden", !admin);
            });
        }
    }

    async function saveOrUpdateRecord(event) {
        event.preventDefault();

        const rowId = byId("rowId").value;

        const data = {
            farmer_id: byId("farmerId").value,
            name: byId("name").value.trim(),
            gender: byId("gender").value,
            phone: byId("phone").value.trim(),
            crop_name: byId("cropName").value.trim(),
            crop_vol: byId("cropVol").value,
            price: byId("price").value
        };

        if (rowId) {
            data.row_id = rowId;
        }

        const extraFields = {};
        if (Array.isArray(currentExtraColumns)) {
            currentExtraColumns.forEach(col => {
                const input = byId(`dyn_col_${col}`);
                if (input) {
                    const rawVal = input.value.trim();
                    extraFields[col] = rawVal !== "" ? rawVal : null;
                    data[col] = extraFields[col];
                }
            });
        }
        data.extra_fields = extraFields;

        const button = byId("saveButton");
        button.disabled = true;
        button.textContent = rowId ? "Updating…" : "Saving…";
        showFormMessage("");

        try {
            const response = await fetchWithTimeout(
                rowId ? "/update" : "/save",
                {
                    method: rowId ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            const result = await readJsonResponse(response);

            showFormMessage(
                `${result.message} Total value: ${formatCurrency(result.total_value)}; ` +
                `production level: ${result.production_level}; ` +
                `farmer status: ${result.farmer_status}.`,
                "success"
            );

            resetForm(false);
            await loadRecords();

        } catch (error) {
            showFormMessage(error.message, "error");
        } finally {
            button.disabled = false;
            button.textContent = byId("rowId").value
                ? "Update crop record"
                : "Add crop record";
        }
    }

    function startEdit(record) {
        byId("rowId").value = record.row_id;
        byId("farmerId").value = record.farmer_id;
        byId("name").value = record.name || "";
        byId("gender").value = record.gender || "";
        byId("phone").value = record.phone || "";
        byId("cropName").value = record.crop_name || "";
        byId("cropVol").value = record.crop_vol ?? "";
        byId("price").value = record.price ?? "";

        // Populate dynamic column fields
        if (Array.isArray(currentExtraColumns)) {
            currentExtraColumns.forEach(col => {
                const input = byId(`dyn_col_${col}`);
                if (input) {
                    const val = record[col] !== undefined
                        ? record[col]
                        : (record.extra_fields ? record.extra_fields[col] : null);
                    input.value = (val !== null && val !== undefined) ? val : "";
                }
            });
        }

        byId("formHeading").textContent = "Update crop record";
        byId("formModeBadge").textContent = "EDITING RECORD";
        byId("saveButton").textContent = "Update crop record";
        byId("cancelButton").classList.remove("hidden");

        updatePreview();
        showFormMessage("Editing the selected row. Save to apply changes.");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    async function deleteRecord(record) {
        const label = `${record.crop_name} for farmer ${record.farmer_id}`;

        if (!window.confirm(`Delete ${label}? This deletes only this crop row.`)) {
            return;
        }

        try {
            const response = await fetchWithTimeout(
                `/delete/${encodeURIComponent(record.row_id)}`,
                { method: "DELETE" }
            );

            const result = await readJsonResponse(response);

            if (byId("rowId").value === record.row_id) {
                resetForm();
            }

            byId("tableMessage").textContent = result.message;
            byId("tableMessage").className = "message success";

            await loadRecords();

        } catch (error) {
            byId("tableMessage").textContent = error.message;
            byId("tableMessage").className = "message error";
        }
    }

    function resetForm(clearMessage = true) {
        form.reset();

        byId("rowId").value = "";
        byId("formHeading").textContent = "Add a crop record";
        byId("formModeBadge").textContent = "NEW RECORD";
        byId("saveButton").textContent = "Add crop record";
        byId("cancelButton").classList.add("hidden");

        const dynInputs = document.querySelectorAll("#dynamicFormFields input, #dynamicFormFields select");
        dynInputs.forEach(input => {
            input.value = "";
        });

        updatePreview();

        if (clearMessage) {
            showFormMessage("");
        }
    }

    function updatePreview() {
        const quantityText = byId("cropVol")?.value || "";
        const priceText = byId("price")?.value || "";
        const quantity = Number(quantityText);
        const price = Number(priceText);

        const valid =
            quantityText !== "" &&
            priceText !== "" &&
            Number.isFinite(quantity) &&
            Number.isFinite(price) &&
            quantity >= 0 &&
            price >= 0;

        const totalPreview = byId("totalValuePreview");
        if (totalPreview) {
            totalPreview.textContent = valid
                ? formatCurrency(quantity * price)
                : "₹0.00";
        }

        let level = "—";

        if (
            quantityText !== "" &&
            Number.isFinite(quantity) &&
            quantity >= 0
        ) {
            level = quantity < 500
                ? "LOW"
                : quantity <= 1000
                    ? "MEDIUM"
                    : "HIGH";
        }

        const prodPreview = byId("productionLevelPreview");
        if (prodPreview) {
            prodPreview.textContent = level;
        }
    }

    function showFormMessage(message, type = "") {
        const msgEl = byId("formMessage");
        if (msgEl) {
            msgEl.textContent = message;
            msgEl.className = `message ${type}`.trim();
        }
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-IN", {
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    }

    loadRecords();
    updatePreview();
});

// Display messages in the Table Structure section.
function showStructureMessage(message, isError = false) {
    const element = document.getElementById("structureMessage");
    if (element) {
        element.textContent = message;
        element.style.color = isError ? "#dc2626" : "#15803d";
    }
}

// Load Oracle column names into the dropdowns.
async function loadColumns() {
    try {
        const response = await fetchWithTimeout("/api/columns");
        const data = await readJsonResponse(response);

        if (!data.success) {
            throw new Error(data.message || "Could not load columns.");
        }

        availableColumnMeta = Array.isArray(data.columns) ? data.columns : [];
        if (typeof window.renderDynamicFormFields === "function") {
            window.renderDynamicFormFields(currentExtraColumns);
        }

        ["modifyColumnName", "renameColumnName"].forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            const previousValue = select.value;
            select.replaceChildren();

            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Select a column";
            select.appendChild(placeholder);

            data.columns.forEach(column => {
                const option = document.createElement("option");
                option.value = column.name;
                option.textContent = `${column.name} (${column.definition})`;

                if (column.protected) {
                    option.disabled = true;
                    option.textContent += " — protected";
                } else {
                    select.appendChild(option);
                }
            });

            if (
                [...select.options].some(option =>
                    option.value === previousValue && !option.disabled
                )
            ) {
                select.value = previousValue;
            }
        });

        // For Delete: list columns, but protected (pre-loaded) columns cannot be deleted
        const deleteSelect = document.getElementById("deleteColumnName");
        if (deleteSelect) {
            const previousValue = deleteSelect.value;
            deleteSelect.replaceChildren();

            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Select a column to delete";
            deleteSelect.appendChild(placeholder);

            const hasDeletable = data.columns.some(c => !c.protected);

            data.columns.forEach(column => {
                const option = document.createElement("option");
                option.value = column.name;
                if (column.protected) {
                    option.disabled = true;
                    option.textContent = `${column.name} — pre-loaded (cannot delete)`;
                } else {
                    option.textContent = `${column.name} (${column.definition})`;
                    deleteSelect.appendChild(option);
                }
            });

            if (!hasDeletable) {
                placeholder.textContent = "No columns to delete";
            }

            if (
                [...deleteSelect.options].some(option =>
                    option.value === previousValue && !option.disabled
                )
            ) {
                deleteSelect.value = previousValue;
            }
        }
    } catch (error) {
        showStructureMessage(error.message, true);
    }
}

// Send a JSON request and show the result.
async function submitStructureRequest(url, payload) {
    showStructureMessage("Processing...");

    try {
        const response = await fetchWithTimeout(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await readJsonResponse(response);

        if (!data.success) {
            throw new Error(data.message || "Operation failed.");
        }

        showStructureMessage(data.message);

        await loadColumns();

        if (typeof window.loadRecords === "function") {
            await window.loadRecords();
        } else if (typeof loadRecords === "function") {
            await loadRecords();
        }

        return true;
    } catch (error) {
        showStructureMessage(error.message, true);
        return false;
    }
}

// ADD COLUMN
document.getElementById("addColumnForm")?.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        const name = document.getElementById("newColumnName").value.trim();
        const type = document.getElementById("newColumnType").value;
        const size = document.getElementById("newColumnSize").value;

        const success = await submitStructureRequest(
            "/api/columns",
            { name, type, size }
        );

        if (success) this.reset();
    }
);

// MODIFY DATATYPE / SIZE
document.getElementById("modifyColumnForm")?.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        const name = document.getElementById("modifyColumnName").value;
        const type = document.getElementById("modifyColumnType").value;
        const size = document.getElementById("modifyColumnSize").value;

        if (!name) {
            showStructureMessage("Select a column first.", true);
            return;
        }

        await submitStructureRequest(
            "/api/columns/modify",
            { name, type, size }
        );
    }
);

// RENAME COLUMN
document.getElementById("renameColumnForm")?.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        const old_name = document.getElementById("renameColumnName").value;
        const new_name = document.getElementById("renamedColumnName").value.trim();

        if (!old_name || !new_name) {
            showStructureMessage(
                "Select the existing column and enter its new name.",
                true
            );
            return;
        }

        const success = await submitStructureRequest(
            "/api/columns/rename",
            { old_name, new_name }
        );

        if (success) this.reset();
    }
);

// DELETE COLUMN
document.getElementById("deleteColumnForm")?.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        const name = document.getElementById("deleteColumnName").value;

        if (!name) {
            showStructureMessage("Select a newly created column to delete.", true);
            return;
        }

        if (!window.confirm(`Are you sure you want to delete column "${name}"? All data in this column will be permanently removed.`)) {
            return;
        }

        const success = await submitStructureRequest(
            "/api/columns/delete",
            { name }
        );

        if (success) this.reset();
    }
);