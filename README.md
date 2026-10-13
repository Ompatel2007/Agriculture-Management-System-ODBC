# Agriculture Management System

A web-based Agriculture Management System built using **Python, Flask, Oracle Database, HTML, CSS, and JavaScript**. The application allows administrators to manage farmer and crop records while providing farmers with read-only access to their own information.

## Table of Contents

1. [Database Connection Configuration](#1-database-connection-configuration)
2. [Prerequisites](#2-prerequisites)
3. [Installation](#3-installation)
4. [Database Setup](#4-database-setup)
5. [Running the Project](#5-running-the-project)
6. [Features](#6-features)
7. [User Roles and Permissions](#7-user-roles-and-permissions)
8. [Business Logic](#8-business-logic)
9. [Database Schema](#9-database-schema)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Database Connection Configuration

Before running the application, configure the Oracle Database connection in `app.py`.

Locate the database configuration section and update the following values according to your Oracle Database installation:

```python
DB_USER = os.getenv("DB_USER", "Example123")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Example123")
DB_DSN = os.getenv("DB_DSN", "localhost:1521/xe")
```

Change the default username, password, and DSN to match your database credentials.

| Parameter | Description | Example |
|---|---|---|
| `DB_USER` | Oracle database username | `Example123` |
| `DB_PASSWORD` | Password for the database user | `Example123` |
| `DB_DSN` | Oracle connection identifier | `localhost:1521/xe` |

For a local Oracle Database XE installation, `localhost:1521/xe` is a common DSN configuration. Adjust it if your database uses a different host, port, or service name.

**Important:** The database user must have the required permissions to access and modify the `AGRICULTURE` table and manage its structure if you intend to use the table-management features.

### Oracle Instant Client

This project uses the `oracledb` Python library in Thick mode. Install Oracle Instant Client and configure its location in `app.py` if your setup requires it.

For example, on Windows:

```python
oracledb.init_oracle_client(
    lib_dir=r"C:\path\to\instantclient"
)
```

Replace the example path with the actual location of your Oracle Instant Client installation. Ensure the installed client is compatible with your Oracle Database and operating system.

Oracle Instant Client is a separate system dependency and is not installed through `requirements.txt`.

---

## 2. Prerequisites

Ensure the following software is installed:

- **Python 3.10 or later** (use a version supported by your installed dependencies).
- **Oracle Database XE 11g** or a compatible Oracle Database installation.
- **Oracle Instant Client**, when required for Thick mode.
- **Git**, for cloning and managing the repository.
- A web browser to access the application.

---

## 3. Installation

### Step 1: Clone the repository

```bash
git clone https://github.com/Ompatel2007/Agriculture-Management-System-ODBC
cd Agriculture-Management-System-ODBC
```

Replace the placeholders with your repository URL and project directory name.

### Step 2: Create a virtual environment (recommended)

On Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

On Linux or macOS:

```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install the required Python libraries

The project includes a `requirements.txt` file containing the Python dependencies.

Run:

```bash
python -m pip install -r requirements.txt
```

The primary Python dependencies are:

- `Flask` — web application framework and HTTP routing.
- `oracledb` — connectivity between Python and Oracle Database.

---

## 4. Database Setup

### Step 1: Start Oracle Database

Ensure that your Oracle Database service is running and accessible using your configured DSN.

### Step 2: Connect to Oracle

Open SQL*Plus or another Oracle SQL client and connect using the database credentials configured in `app.py`.

### Step 3: Create the AGRICULTURE table

Execute the following SQL statement:

```sql
CREATE TABLE AGRICULTURE (
    FARMER_ID         NUMBER,
    NAME              VARCHAR2(100) NOT NULL,
    GENDER            VARCHAR2(10),
    PHONE             VARCHAR2(15),
    CROP_NAME         VARCHAR2(100) NOT NULL,
    CROP_VOL          NUMBER(10,2),
    PRICE             NUMBER(10,2),
    TOTAL_VALUE       NUMBER(12,2),
    PRODUCTION_LEVEL  VARCHAR2(10),
    FARMER_STATUS     VARCHAR2(10)
);
```

### Step 4: Verify the table

```sql
DESC AGRICULTURE;
```

Check the existing records:

```sql
SELECT * FROM AGRICULTURE;
```

If the table already exists, do not execute the `CREATE TABLE` statement again. Ensure the existing table has the columns expected by the application.

---

## 5. Running the Project

After configuring the database and installing the dependencies, start the application from the project directory:

```bash
python app.py
```

The Flask development server runs at:

**http://127.0.0.1:5000**

Open this address in your browser to access the login page.

To stop the server, press `Ctrl + C` in the terminal.

---

## 6. Features

### Farmer and Crop Record Management

- View farmer details and their associated crop records.
- Store multiple crop records for a farmer.
- Record farmer ID, name, gender, phone number, crop name, production quantity, and price.
- Automatically calculate the total value of a crop record.
- Automatically classify crop production into LOW, MEDIUM, or HIGH categories.
- Recalculate farmer status based on total production quantity.

### Administrator Dashboard

- View all farmer and crop records.
- Add new crop records.
- Update existing records.
- Delete crop records.
- Manage the database table structure through the table-management interface.
- Access administrative actions that are unavailable to regular farmers.

### Farmer Dashboard

- Log in using the farmer's name as the username and password.
- View only records associated with the logged-in farmer's name.
- Access farmer and crop information in read-only mode.
- Use a restricted interface without administrative record-management actions.

### Validation and Data Consistency

- Validate farmer IDs, names, gender, crop names, production quantities, and prices.
- Reject invalid or negative production quantities and prices.
- Calculate crop value automatically from production quantity and price.
- Keep farmer details consistent across crop records belonging to the same farmer ID.
- Recalculate farmer status after relevant record changes.
- Use database transactions for record modifications.

### Web Interface

- Login page for authentication.
- Dashboard for viewing agricultural records.
- Forms for administrative record operations.
- Separate administrative and farmer interfaces.
- Client-side JavaScript for interacting with Flask endpoints.

---

## 7. User Roles and Permissions

The application provides two user roles.

| Operation | Administrator | Farmer |
|---|---|---|
| View all farmer records | Yes | No |
| View own crop records | Yes | Yes |
| Add crop records | Yes | No |
| Update crop records | Yes | No |
| Delete crop records | Yes | No |
| Manage table structure | Yes | No |
| Access administrative actions | Yes | No |

### Administrator Login

The default demonstration credentials are:

- **Username:** `admin`
- **Password:** `admin999`

### Farmer Login

- **Username:** The farmer's name as stored in the database.
- **Password:** The same farmer name.

For example, if the farmer's name is `Ravi`, the demonstration login is:

- Username: `Ravi`
- Password: `Ravi`

The farmer must have a matching record in the `AGRICULTURE` table.

**Note:** This is a demonstration authentication mechanism. Farmer names are not unique credentials, so a production deployment should use unique accounts and securely hashed passwords.

---

## 8. Business Logic

### Crop Value Calculation

The total value of a crop record is calculated automatically:

```text
Total Value = Crop Production Quantity × Price
```

### Production Level Classification

The production level is assigned according to the crop's production quantity:

| Production Quantity | Production Level |
|---|---|
| Less than 500 | LOW |
| 500 to 1000, inclusive | MEDIUM |
| Greater than 1000 | HIGH |

### Farmer Status Classification

Farmer status is determined using the sum of the production quantities across all crop records associated with the farmer ID.

| Total Production | Farmer Status |
|---|---|
| Less than 500 | INACTIVE |
| 500 or greater | ACTIVE |

The application recalculates farmer status when relevant crop records are added, updated, or deleted.

---

## 9. Database Schema

The application uses the `AGRICULTURE` table.

| Column | Description |
|---|---|
| `FARMER_ID` | Identifier associated with a farmer |
| `NAME` | Farmer's name |
| `GENDER` | Farmer's gender |
| `PHONE` | Farmer's contact number |
| `CROP_NAME` | Name of the crop |
| `CROP_VOL` | Crop production quantity |
| `PRICE` | Price per unit |
| `TOTAL_VALUE` | Calculated crop value |
| `PRODUCTION_LEVEL` | LOW, MEDIUM, or HIGH |
| `FARMER_STATUS` | ACTIVE or INACTIVE |

Each row represents a crop record. A farmer can have multiple rows, with their farmer details repeated across those records.

---

## 10. Troubleshooting

### Database connection errors

- Verify that Oracle Database is running.
- Check the username, password, host, port, and service name in `app.py`.
- Confirm that the database user has the required table privileges.
- Verify that the `AGRICULTURE` table exists.

### `ModuleNotFoundError`

Install the project dependencies:

```bash
python -m pip install -r requirements.txt
```

Ensure that the correct Python virtual environment is activated.

### Oracle Thick mode errors

If the application reports an Oracle Client initialization or Thick mode error:

- Verify that Oracle Instant Client is installed.
- Confirm that the `lib_dir` path points to the correct installation directory.
- Check architecture compatibility between Python and Oracle Instant Client.
- Restart the application after correcting the configuration.

### Port already in use

If port `5000` is occupied, stop the other process using it or change the port in the `app.run()` configuration.
