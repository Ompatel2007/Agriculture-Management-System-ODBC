
const byId = (id) => document.getElementById(id);
let availableColumnMeta = [];
let currentExtraColumns = [];

document.addEventListener("DOMContentLoaded", () => {


    const form = byId("recordForm");
    const tbody = byId("recordsTableBody");
    const table = tbody.closest("table");
    let role = null;
    let isAdmin = false;


    // Hide the Actions column header for non-admin users.
    if (table) {
        const headerRow = table.querySelector("thead tr");

        if (headerRow && headerRow.lastElementChild) {
            headerRow.lastElementChild.classList.toggle("hidden", !isAdmin);
        }
    }

    byId("logoutButton").addEventListener("click", async () => {
        try {
            await fetch("/api/logout", {
                method: "POST"
            });
        } finally {
            sessionStorage.removeItem("loggedIn");
            sessionStorage.removeItem("role");
            window.location.replace("/");
        }
    });

    byId("refreshButton").addEventListener("click", loadRecords);
    byId("cancelButton").addEventListener("click", () => resetForm());

    form.addEventListener("submit", saveOrUpdateRecord);

    form.addEventListener("reset", () => {
        setTimeout(() => {
            if (!byId("rowId").value) {
                updatePreview();
            }
        }, 0);
    });

    ["cropVol", "price"].forEach((id) => {
        byId(id).addEventListener("input", updatePreview);
    });

    loadRecords();
    updatePreview();

    async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
        const controller = new AbortController();

        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {
            return await fetch(url, {
                ...options,
                signal: controller.signal
            });
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    `Request timed out after ${timeoutMs / 1000} seconds. ` +
                    "Check the Flask terminal and Oracle database connection."
                );
            }

            throw error;
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

            const defText = colMeta ? ` (${colMeta.definition})` : "";

            const textSpan = document.createElement("span");
            textSpan.textContent = col;
            label.appendChild(textSpan);

            // if (defText) {
            //     const defSpan = document.createElement("span");
            //     defSpan.className = "muted";
            //     defSpan.style.fontWeight = "normal";
            //     defSpan.style.fontSize = "0.75rem";
            //     defSpan.textContent = defText;
            //     label.appendChild(defSpan);
            // }

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
            console.log("[UI] Requesting GET /records");

            const response = await fetchWithTimeout("/records");

            if (response.status === 401) {
                window.location.replace("/");
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

            console.log(`[UI] Loaded ${records.length} records.`);
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

            console.error("[UI] Could not load records:", error);
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
        const quantityText = byId("cropVol").value;
        const priceText = byId("price").value;
        const quantity = Number(quantityText);
        const price = Number(priceText);

        const valid =
            quantityText !== "" &&
            priceText !== "" &&
            Number.isFinite(quantity) &&
            Number.isFinite(price) &&
            quantity >= 0 &&
            price >= 0;

        byId("totalValuePreview").textContent = valid
            ? formatCurrency(quantity * price)
            : "₹0.00";

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

        byId("productionLevelPreview").textContent = level;
    }

    function showFormMessage(message, type = "") {
        byId("formMessage").textContent = message;
        byId("formMessage").className = `message ${type}`.trim();
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
        const response = await fetch("/api/columns");
        const data = await response.json();

        if (!response.ok || !data.success) {
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
                option.textContent =
                    `${column.name} (${column.definition})`;

                // Core columns are viewable but cannot be structurally changed.
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


// Send a JSON request to Flask and show the result.
async function submitStructureRequest(url, payload) {
    showStructureMessage("Processing...");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Operation failed.");
        }

        showStructureMessage(data.message);

        await loadColumns();

        // Refresh crop records if your existing function is available.
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

        const old_name =
            document.getElementById("renameColumnName").value;

        const new_name =
            document.getElementById("renamedColumnName").value.trim();

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