# Agriculture Management System

## Overview

The **Agriculture Management System** is a web-based application developed using Python, Flask, and Oracle Database to manage agricultural production records. It allows administrators to manage farmer and crop information, calculate production values, classify production levels, and monitor farmer activity. Farmers can log in to view their own records.

## Table of Contents

1. [Installation and Setup](#1-installation-and-setup)
2. [Database Configuration](#2-database-configuration)
3. [Features](#3-features)
4. [Technology Stack](#4-technology-stack)
5. [Prerequisites](#5-prerequisites)
6. [Production Classification Rules](#6-production-classification-rules)
7. [Running the Application](#7-running-the-application)
8. [Login and User Roles](#8-login-and-user-roles)
9. [Troubleshooting](#9-troubleshooting)

## 1. Installation and Setup

Follow these steps to install and run the Agriculture Management System locally.

### Step 1: Clone the Repository

```bash
git clone https://github.com/Ompatel2007/Agriculture-Management-System-ODBC.git
cd Agriculture-Management-System-ODBC
```

### Step 2: Create a Virtual Environment (Optional)

Create an isolated Python environment to manage the project's dependencies.

```bash
python -m venv venv
```

Activate the environment:

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/macOS:**
```bash
source venv/bin/activate
```

### Step 3: Install Dependencies

Install the required Python packages using `requirements.txt`.

```bash
pip install -r requirements.txt
```

### Step 4: Configure Oracle Instant Client

The application uses the `oracledb` Python package to connect to Oracle Database. If the application is configured to use Thick mode, install Oracle Instant Client and update the client library path in `app.py` to match your system.

Ensure that the installed Oracle Instant Client architecture matches your Python installation.

### Step 5: Configure Database Credentials

Set the environment variables required for the Oracle connection:

**Windows Command Prompt:**
```cmd
set ORACLE_USER=your_username
set ORACLE_PASSWORD=your_password
set ORACLE_DSN=localhost:1521/xe
```

**Linux/macOS:**
```bash
export ORACLE_USER=your_username
export ORACLE_PASSWORD=your_password
export ORACLE_DSN=localhost:1521/xe
```

Replace the example values with your actual Oracle Database credentials and connection details.

## 2. Database Configuration

The application uses Oracle Database to store and manage agricultural records.

The primary table is `AGRICULTURE`, which contains the following fields:

| Column | Description |
|---|---|
| `FARMER_ID` | Unique identifier for the farmer record |
| `NAME` | Farmer's name |
| `GENDER` | Farmer's gender |
| `PHONE` | Contact number |
| `CROP_NAME` | Name of the crop |
| `CROP_VOL` | Quantity of crop produced |
| `PRICE` | Price per unit |
| `TOTAL_VALUE` | Total production value |
| `PRODUCTION_LEVEL` | Production classification |
| `FARMER_STATUS` | Farmer's activity status |

Ensure that the Oracle Database instance is running and that the configured user has the required database permissions.

The application also supports dynamic management of additional table columns through the administrator interface.

## 3. Features

### Farmer and Crop Management
- Add, view, update, and delete agricultural records through the administrator interface.
- Store farmer details, crop information, production quantities, and prices.
- Calculate total production value automatically.

### Dynamic Column Management
- Add additional columns to the database table.
- Modify supported column datatypes and sizes.
- Rename or delete additional columns.
- Display additional columns dynamically in the administrator's record form and table.

Supported datatypes include `VARCHAR2`, `CHAR`, `NUMBER`, and `DATE`, subject to the application's validation rules.

Core columns are protected from modification, renaming, and deletion through the dynamic column management interface.

### Production Classification
- Classify production based on crop quantity.
- Determine farmer activity status based on total crop quantity.
- Recalculate relevant values when records are added or deleted.

### Role-Based Access
- Administrators can manage agricultural records.
- Farmers can view their own records in read-only mode.

## 4. Technology Stack

| Technology | Purpose |
|---|---|
| Python | Application logic |
| Flask | Web application framework |
| Oracle Database | Data storage and management |
| `oracledb` | Python connectivity to Oracle Database |
| HTML | Webpage structure |
| CSS | Styling and layout |
| JavaScript | Client-side interactions |

## 5. Prerequisites

Before running the application, ensure that the following are available:

- Python installed on your system.
- Oracle Database installed and running.
- Oracle Instant Client, if required by the configured Thick-mode connection.
- `pip` for installing Python dependencies.
- A web browser.
- Appropriate Oracle Database credentials and permissions.

## 6. Production Classification Rules

The application uses production quantity to classify production levels.

| Production Quantity | Production Level |
|---|---|
| Below 500 | `LOW` |
| 500–1000, inclusive | `MEDIUM` |
| Above 1000 | `HIGH` |

### Farmer Status

Farmer activity status is determined by total crop quantity:

| Total Crop Quantity | Farmer Status |
|---|---|
| 500 or more | `ACTIVE` |
| Below 500 | `INACTIVE` |

Relevant status values are recalculated when agricultural records are added or deleted.

## 7. Running the Application

After installing dependencies and configuring the database connection, start the Flask application from the project directory:

```bash
python app.py
```

Once the application starts successfully, open the following URL in your browser:

```text
http://127.0.0.1:5000
```

Ensure that the configured Oracle Database instance is accessible before using the application's features.

## 8. Login and User Roles

The application supports administrator and farmer logins.

### Administrator

The administrator can manage agricultural records and use the available database column management functionality.

The current application code uses the following hardcoded administrator credentials:

- **Username:** `admin`
- **Password:** `admin999`

### Farmer

Farmers can log in to view their own agricultural records. The farmer username must match the farmer's name in the `AGRICULTURE` table, and the password is checked against the username without case sensitivity, as implemented in the application.

Farmer access is restricted to the corresponding farmer's records, and the farmer interface is read-only.

## 9. Troubleshooting

### Oracle Database Connection Errors
- Confirm that Oracle Database is running.
- Verify `ORACLE_USER`, `ORACLE_PASSWORD`, and `ORACLE_DSN`.
- Check that the host, port, and service name are correct.
- Ensure that Oracle Instant Client is installed and its path is correctly configured if Thick mode is enabled.

### Missing Python Packages
Install the project's dependencies again:

```bash
pip install -r requirements.txt
```

### Login Issues
- Verify that the administrator credentials match the values configured in the application.
- For farmer login, check that the username matches the farmer's name stored in the database.
- Confirm that the required farmer record exists.

### Column Management Issues
- Ensure that the database user has the necessary permissions for the requested schema operation.
- Verify that the selected datatype and size are supported by the application.
- Remember that core columns cannot be renamed or deleted through the dynamic column management interface.

### Records Not Appearing
- Confirm that the record exists in the Oracle Database.
- Verify the farmer name used for login.
- Check the terminal output for Flask or database errors.