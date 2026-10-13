
const byId = (id) => document.getElementById(id);

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

    async function loadRecords() {
        tbody.innerHTML = `
            <tr>
                <td colspan="${isAdmin ? 11 : 10}" class="empty-cell">
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

            role = result.role;
            isAdmin = role === "admin";

            if (!Array.isArray(records)) {
                throw new Error("Unexpected response: records must be an array.");
            }

            applyRolePermissions(role);
            if (isAdmin) {
                await loadColumns();
            }

            tbody.replaceChildren();

            if (records.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="${isAdmin ? 11 : 10}" class="empty-cell">
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

                if (isAdmin) {
                    actions.append(editButton, deleteButton);
                    row.appendChild(actions);
                }

                tbody.appendChild(row);
            });

            console.log(`[UI] Loaded ${records.length} records.`);
        } catch (error) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${isAdmin ? 11 : 10}" class="empty-cell">
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
                }

                select.appendChild(option);
            });

            if (
                [...select.options].some(option =>
                    option.value === previousValue && !option.disabled
                )
            ) {
                select.value = previousValue;
            }
        });
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
        if (typeof loadRecords === "function") {
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