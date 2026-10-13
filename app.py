import os
from decimal import Decimal, InvalidOperation
import re
from functools import wraps
import oracledb
from flask import Flask, request, jsonify, send_from_directory, session, redirect


oracledb.init_oracle_client(
    lib_dir=r"C:\Users\user\Downloads\instant_client\instantclient-basic-windows.x64-23.26.3.0.0\instantclient_23_26" # your instant client folder path here
)

app = Flask(__name__)

app.secret_key = os.getenv(
    "FLASK_SECRET_KEY",
    "ExampleKey2864871634" # A long random secret key here
)

DB_USER = os.getenv("ORACLE_USER", "Example123") # Your username here
DB_PASSWORD = os.getenv("ORACLE_PASSWORD", "Example123") # Your password here
DB_DSN = os.getenv("ORACLE_DSN", "localhost:3000/xe") # Your IP here and service name here

def login_required(route_function):
    @wraps(route_function)
    def wrapper(*args, **kwargs):
        if "role" not in session:
            if request.path.startswith("/api/") or request.path == "/records":
                return jsonify({
                    "success": False,
                    "message": "Please log in first."
                }), 401

            return redirect("/")

        return route_function(*args, **kwargs)

    return wrapper


def admin_required(route_function):
    @wraps(route_function)
    def wrapper(*args, **kwargs):
        if "role" not in session:
            return jsonify({
                "success": False,
                "message": "Please log in first."
            }), 401

        if session.get("role") != "admin":
            return jsonify({
                "success": False,
                "message": "Only the admin can perform this operation."
            }), 403

        return route_function(*args, **kwargs)

    return wrapper

def get_connection():
    print("[DB] Attempting Oracle connection...", flush=True)

    conn = oracledb.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        dsn=DB_DSN
    )

    print("[DB] Oracle connection successful.", flush=True)
    return conn


def get_production_level(crop_vol):
    if crop_vol < 500:
        return "LOW"
    if crop_vol <= 1000:
        return "MEDIUM"
    return "HIGH"


def get_farmer_status(total_production):
    return "ACTIVE" if total_production >= 500 else "INACTIVE"


def recalculate_farmer_status(cursor, farmer_id):
    cursor.execute(
        """
        SELECT NVL(SUM(CROP_VOL), 0)
        FROM AGRICULTURE
        WHERE FARMER_ID = :1
        """,
        (farmer_id,)
    )

    total_production = float(cursor.fetchone()[0] or 0)
    status = get_farmer_status(total_production)

    cursor.execute(
        """
        UPDATE AGRICULTURE
        SET FARMER_STATUS = :1
        WHERE FARMER_ID = :2
        """,
        (status, farmer_id)
    )

    return total_production, status


def parse_record(data):
    try:
        farmer_id = int(data.get("farmer_id"))
        name = str(data.get("name", "")).strip()
        gender = str(data.get("gender", "")).strip().upper()
        phone = str(data.get("phone", "")).strip() or None
        crop_name = str(data.get("crop_name", "")).strip()
        crop_vol = Decimal(str(data.get("crop_vol", "")).strip())
        price = Decimal(str(data.get("price", "")).strip())

    except (TypeError, ValueError, InvalidOperation):
        raise ValueError(
            "Enter a valid farmer ID, production quantity, and price."
        )

    if farmer_id <= 0:
        raise ValueError("Farmer ID must be a positive number.")

    if not name or not crop_name:
        raise ValueError("Farmer name and crop name are required.")

    if gender not in ("M", "F"):
        raise ValueError("Select M or F for gender.")

    if crop_vol < 0 or price < 0:
        raise ValueError(
            "Production quantity and price cannot be negative."
        )

    total_value = crop_vol * price
    production_level = get_production_level(float(crop_vol))

    return {
        "farmer_id": farmer_id,
        "name": name,
        "gender": gender,
        "phone": phone,
        "crop_name": crop_name,
        "crop_vol": crop_vol,
        "price": price,
        "total_value": total_value,
        "production_level": production_level
    }


@app.route("/")
def login_page():
    return send_from_directory(".", "login.html")


@app.route("/agriculture")
@login_required
def agriculture_page():
    return send_from_directory(".", "index.html")


@app.route("/style.css")
def css():
    return send_from_directory(".", "style.css")


@app.route("/script.js")
def javascript():
    return send_from_directory(".", "script.js")


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()

    if not username or not password:
        return jsonify({"error": "Enter a username and password."}), 400

    # Admin login
    if username.lower() == "admin" and password == "admin999":
        session.clear()
        session["role"] = "admin"
        session["username"] = "admin"

        return jsonify({
            "success": True,
            "role": "admin",
            "message": "Admin login successful."
        })

    # Farmer login: username and password must match the farmer's name.
    if username.casefold() == password.casefold():
        conn = cursor = None

        try:
            conn = get_connection()
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM AGRICULTURE
                WHERE LOWER(TRIM(NAME)) = LOWER(TRIM(:username))
                """,
                {"username": username}
            )

            if cursor.fetchone()[0] > 0:
                session.clear()
                session["role"] = "farmer"
                session["username"] = username

                return jsonify({
                    "success": True,
                    "role": "farmer",
                    "message": "Farmer login successful."
                })

        except Exception:
            app.logger.exception("Login verification failed")
            return jsonify({"error": "Unable to verify login."}), 500

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    return jsonify({"error": "Invalid username or password."}), 401

@app.route("/records", methods=["GET"])
@login_required
def get_records():
    connection = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        query = """
            SELECT
                ROWIDTOCHAR(ROWID),
                FARMER_ID,
                NAME,
                GENDER,
                PHONE,
                CROP_NAME,
                CROP_VOL,
                PRICE,
                TOTAL_VALUE,
                PRODUCTION_LEVEL,
                FARMER_STATUS
            FROM AGRICULTURE
        """

        params = {}

        # Farmers can retrieve only their own records.
        if session.get("role") == "farmer":
            query += """
                WHERE LOWER(TRIM(NAME)) = LOWER(TRIM(:username))
            """
            params["username"] = session["username"]

        query += " ORDER BY FARMER_ID"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        records = []

        for row in rows:
            records.append({
                "row_id": row[0],
                "farmer_id": row[1],
                "name": row[2],
                "gender": row[3],
                "phone": row[4],
                "crop_name": row[5],
                "crop_vol": row[6],
                "price": row[7],
                "total_value": row[8],
                "production_level": row[9],
                "farmer_status": row[10]
            })

        return jsonify({
            "success": True,
            "records": records,
            "role": session["role"]
        })

    except Exception:
        app.logger.exception("Failed to fetch agriculture records")
        return jsonify({
            "success": False,
            "message": "Failed to load records."
        }), 500

    finally:
        if connection:
            connection.close()


@app.route("/save", methods=["POST"])
@admin_required
def save_record():
    data = request.get_json(silent=True) or {}

    try:
        record = parse_record(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Keep the farmer details consistent across their existing crop rows.
        cursor.execute(
            """
            UPDATE AGRICULTURE
            SET NAME = :1, GENDER = :2, PHONE = :3
            WHERE FARMER_ID = :4
            """,
            (
                record["name"],
                record["gender"],
                record["phone"],
                record["farmer_id"]
            )
        )

        cursor.execute(
            """
            INSERT INTO AGRICULTURE (
                FARMER_ID,
                NAME,
                GENDER,
                PHONE,
                CROP_NAME,
                CROP_VOL,
                PRICE,
                TOTAL_VALUE,
                PRODUCTION_LEVEL,
                FARMER_STATUS
            )
            VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10)
            """,
            (
                record["farmer_id"],
                record["name"],
                record["gender"],
                record["phone"],
                record["crop_name"],
                record["crop_vol"],
                record["price"],
                record["total_value"],
                record["production_level"],
                "INACTIVE"
            )
        )

        total_production, status = recalculate_farmer_status(
            cursor, record["farmer_id"]
        )

        conn.commit()

        return jsonify({
            "message": "Crop record added successfully.",
            "total_value": float(record["total_value"]),
            "production_level": record["production_level"],
            "farmer_status": status,
            "total_production": total_production
        }), 201

    except Exception as exc:
        if conn is not None:
            conn.rollback()

        app.logger.exception("Could not save agriculture record")
        return jsonify({"error": str(exc)}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@app.route("/update", methods=["PUT"])
@admin_required
def update_record():
    data = request.get_json(silent=True) or {}
    row_id = str(data.get("row_id", "")).strip()

    if not row_id:
        return jsonify({
            "error": "Missing row identifier. Select a record to update."
        }), 400

    try:
        record = parse_record(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT FARMER_ID
            FROM AGRICULTURE
            WHERE ROWID = CHARTOROWID(:1)
            """,
            (row_id,)
        )

        previous = cursor.fetchone()

        if previous is None:
            return jsonify({
                "error": "That record no longer exists. Refresh and try again."
            }), 404

        old_farmer_id = int(previous[0])

        cursor.execute(
            """
            UPDATE AGRICULTURE
            SET FARMER_ID = :1,
                NAME = :2,
                GENDER = :3,
                PHONE = :4,
                CROP_NAME = :5,
                CROP_VOL = :6,
                PRICE = :7,
                TOTAL_VALUE = :8,
                PRODUCTION_LEVEL = :9
            WHERE ROWID = CHARTOROWID(:10)
            """,
            (
                record["farmer_id"],
                record["name"],
                record["gender"],
                record["phone"],
                record["crop_name"],
                record["crop_vol"],
                record["price"],
                record["total_value"],
                record["production_level"],
                row_id
            )
        )

        # Keep the farmer details consistent across all their crop rows.
        cursor.execute(
            """
            UPDATE AGRICULTURE
            SET NAME = :1, GENDER = :2, PHONE = :3
            WHERE FARMER_ID = :4
            """,
            (
                record["name"],
                record["gender"],
                record["phone"],
                record["farmer_id"]
            )
        )

        # Recalculate status for both IDs if the row changed farmer.
        recalculate_farmer_status(cursor, old_farmer_id)
        _, new_status = recalculate_farmer_status(
            cursor, record["farmer_id"]
        )

        conn.commit()

        return jsonify({
            "message": "Record updated successfully.",
            "total_value": float(record["total_value"]),
            "production_level": record["production_level"],
            "farmer_status": new_status
        })

    except Exception as exc:
        if conn is not None:
            conn.rollback()

        app.logger.exception("Could not update agriculture record")
        return jsonify({"error": str(exc)}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@app.route("/delete/<row_id>", methods=["DELETE"])
@admin_required
def delete_record(row_id):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT FARMER_ID
            FROM AGRICULTURE
            WHERE ROWID = CHARTOROWID(:1)
            """,
            (row_id,)
        )

        row = cursor.fetchone()

        if row is None:
            return jsonify({
                "error": "Record not found. Refresh the table and try again."
            }), 404

        farmer_id = int(row[0])

        cursor.execute(
            """
            DELETE FROM AGRICULTURE
            WHERE ROWID = CHARTOROWID(:1)
            """,
            (row_id,)
        )

        recalculate_farmer_status(cursor, farmer_id)
        conn.commit()

        return jsonify({
            "message": "Crop record deleted successfully."
        })

    except Exception as exc:
        if conn is not None:
            conn.rollback()

        app.logger.exception("Could not delete agriculture record")
        return jsonify({"error": str(exc)}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

CORE_COLUMNS = {
    "FARMER_ID", "NAME", "GENDER", "PHONE",
    "CROP_NAME", "CROP_VOL", "PRICE",
    "TOTAL_VALUE", "PRODUCTION_LEVEL", "FARMER_STATUS"
}

ALLOWED_TYPES = {"VARCHAR2", "CHAR", "NUMBER", "DATE"}


def valid_column_name(name):
    return bool(
        name
        and re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,29}", name)
    )


def get_column_type(data_type, size):
    data_type = (data_type or "").upper()

    if data_type not in ALLOWED_TYPES:
        raise ValueError("Unsupported datatype.")

    if data_type in {"VARCHAR2", "CHAR"}:
        try:
            size = int(size)
        except (TypeError, ValueError):
            raise ValueError("Enter a valid column size.")

        if not 1 <= size <= 4000:
            raise ValueError("Size must be between 1 and 4000.")

        return f"{data_type}({size})"

    if data_type == "NUMBER":
        if size not in (None, ""):
            try:
                precision = int(size)
            except (TypeError, ValueError):
                raise ValueError("NUMBER precision must be a number.")

            if not 1 <= precision <= 38:
                raise ValueError("NUMBER precision must be between 1 and 38.")

            return f"NUMBER({precision})"

        return "NUMBER"

    return "DATE"


def column_exists(cursor, column_name):
    cursor.execute("""
        SELECT COUNT(*)
        FROM USER_TAB_COLUMNS
        WHERE TABLE_NAME = 'AGRICULTURE'
          AND COLUMN_NAME = :column_name
    """, {"column_name": column_name.upper()})

    return cursor.fetchone()[0] > 0


@app.route("/api/columns", methods=["GET"])
@admin_required
def list_columns():
    connection = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH,
                   DATA_PRECISION, DATA_SCALE
            FROM USER_TAB_COLUMNS
            WHERE TABLE_NAME = 'AGRICULTURE'
            ORDER BY COLUMN_ID
        """)

        columns = []
        for name, dtype, length, precision, scale in cursor.fetchall():
            if dtype in ("VARCHAR2", "CHAR"):
                definition = f"{dtype}({length})"
            elif dtype == "NUMBER" and precision is not None:
                definition = f"NUMBER({precision},{scale or 0})"
            else:
                definition = dtype

            columns.append({
                "name": name,
                "type": dtype,
                "definition": definition,
                "protected": name in CORE_COLUMNS
            })

        return jsonify({"success": True, "columns": columns})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        if connection:
            connection.close()


@app.route("/api/columns", methods=["POST"])
@admin_required
def add_column():
    connection = None

    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").upper()

        if not valid_column_name(name):
            return jsonify({
                "success": False,
                "message": "Use a valid column name (letters, numbers and underscores; start with a letter)."
            }), 400

        definition = get_column_type(
            data.get("type"), data.get("size")
        )

        connection = get_connection()
        cursor = connection.cursor()

        if column_exists(cursor, name):
            return jsonify({
                "success": False,
                "message": f"Column {name} already exists."
            }), 400

        cursor.execute(
            f"ALTER TABLE AGRICULTURE ADD ({name} {definition})"
        )
        connection.commit()

        return jsonify({
            "success": True,
            "message": f"Column {name} added successfully."
        })

    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if connection:
            connection.close()


@app.route("/api/columns/modify", methods=["POST"])
@admin_required
def modify_column():
    connection = None

    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").upper()

        if not valid_column_name(name):
            return jsonify({
                "success": False,
                "message": "Invalid column name."
            }), 400

        if name in CORE_COLUMNS:
            return jsonify({
                "success": False,
                "message": "Changing core application columns is disabled."
            }), 400

        definition = get_column_type(
            data.get("type"), data.get("size")
        )

        connection = get_connection()
        cursor = connection.cursor()

        if not column_exists(cursor, name):
            return jsonify({
                "success": False,
                "message": f"Column {name} does not exist."
            }), 404

        cursor.execute(
            f"ALTER TABLE AGRICULTURE MODIFY ({name} {definition})"
        )
        connection.commit()

        return jsonify({
            "success": True,
            "message": f"Column {name} modified to {definition}."
        })

    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({
            "success": False,
            "message": str(e) +
                " Check whether existing data allows this change."
        }), 500
    finally:
        if connection:
            connection.close()


@app.route("/api/columns/rename", methods=["POST"])
@admin_required
def rename_column():
    connection = None

    try:
        data = request.get_json(silent=True) or {}
        old_name = (data.get("old_name") or "").upper()
        new_name = (data.get("new_name") or "").upper()

        if not valid_column_name(old_name) or not valid_column_name(new_name):
            return jsonify({
                "success": False,
                "message": "Enter valid old and new column names."
            }), 400

        if old_name in CORE_COLUMNS:
            return jsonify({
                "success": False,
                "message": "Renaming core application columns is disabled."
            }), 400

        if old_name == new_name:
            return jsonify({
                "success": False,
                "message": "The new name must be different."
            }), 400

        connection = get_connection()
        cursor = connection.cursor()

        if not column_exists(cursor, old_name):
            return jsonify({
                "success": False,
                "message": f"Column {old_name} does not exist."
            }), 404

        if column_exists(cursor, new_name):
            return jsonify({
                "success": False,
                "message": f"Column {new_name} already exists."
            }), 400

        cursor.execute(
            f"ALTER TABLE AGRICULTURE RENAME COLUMN {old_name} TO {new_name}"
        )
        connection.commit()

        return jsonify({
            "success": True,
            "message": f"Column renamed from {old_name} to {new_name}."
        })

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if connection:
            connection.close()

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({
        "success": True,
        "redirect": "/"
    })

if __name__ == "__main__":
    print("[STARTUP] Agriculture Management System starting.", flush=True)
    print(f"[STARTUP] Oracle DSN: {DB_DSN}", flush=True)
    app.run(host="127.0.0.1", port=5000, debug=True, threaded=True)
