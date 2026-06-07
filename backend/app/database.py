"""
Database — SQLAlchemy models & MySQL connection.
Auto-creates database and tables if they don't exist.
Data is populated via CSV uploads through the /api/upload endpoint.
"""

import os
import sys
import pymysql
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text,
    DateTime, Index, Boolean, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config

Base = declarative_base()
engine = None
SessionLocal = None


class Customer(Base):
    __tablename__ = 'customers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(String(20), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    plan_type = Column(String(50))
    contract_type = Column(String(50))
    tenure_days = Column(Integer)
    monthly_usage_hrs = Column(Float)
    feature_adoption_pct = Column(Float)
    days_since_login = Column(Integer)
    total_users = Column(Integer)
    nps_latest = Column(Float)
    ticket_count = Column(Integer)
    critical_tickets = Column(Integer)
    open_tickets = Column(Integer)
    total_billed = Column(Float)
    avg_payment_value = Column(Float)
    late_payment_count = Column(Integer)
    dunning_count = Column(Integer)
    avg_days_late = Column(Float)
    payment_count = Column(Integer)
    # Additional columns from merged_dataset
    total_transactions = Column(Integer)
    max_days_late = Column(Integer)
    dunning_ratio = Column(Float)
    days_since_last_payment = Column(Integer)
    nps_first = Column(Float)
    nps_avg = Column(Float)
    nps_min = Column(Float)
    nps_count = Column(Float)
    nps_trend = Column(Float)
    days_since_survey = Column(Float)
    high_tickets = Column(Integer)
    billing_tickets = Column(Integer)
    technical_tickets = Column(Integer)
    feature_req_tickets = Column(Integer)
    resolved_tickets = Column(Integer)
    open_ticket_ratio = Column(Float)
    critical_ticket_ratio = Column(Float)
    days_since_last_ticket = Column(Float)
    has_nps = Column(Integer)
    date_corrected = Column(Integer)
    churn = Column(Integer)
    # Risk (computed after prediction)
    risk_score = Column(Float)
    risk_class = Column(String(10))
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'customer_id', name='uq_user_customer'),
    )


class Prediction(Base):
    __tablename__ = 'predictions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(String(20), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    risk_score = Column(Float, nullable=False)
    risk_class = Column(String(10), nullable=False)
    predicted_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_customer_predicted', 'customer_id', 'predicted_at'),
    )


class ChatHistory(Base):
    __tablename__ = 'chat_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(50), nullable=False, index=True)
    user_message = Column(Text, nullable=False)
    bot_response = Column(Text, nullable=False)
    intent_detected = Column(String(50))
    confidence = Column(Float)
    source = Column(String(20), nullable=False)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


def _ensure_database_exists():
    """Create the MySQL database if it doesn't exist."""
    try:
        conn = pymysql.connect(
            host=config.MYSQL_HOST,
            port=config.MYSQL_PORT,
            user=config.MYSQL_USER,
            password=config.MYSQL_PASSWORD,
        )
        cursor = conn.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{config.MYSQL_DB}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        conn.commit()
        cursor.close()
        conn.close()
        print(f"[DB] Database '{config.MYSQL_DB}' ensured.")
        return True
    except Exception as e:
        print(f"[DB WARNING] Cannot connect to MySQL server: {e}")
        return False

# NOTE: _seed_from_csv() function removed
# Automatic database seeding is disabled. Data is now only inserted via CSV uploads
# through the /api/upload endpoint.



def init_db():
    """Initialize database connection, create tables, and seed default admin."""
    global engine, SessionLocal

    # Step 1: Ensure database exists
    if not _ensure_database_exists():
        return False

    try:
        # Step 2: Connect with SQLAlchemy
        engine = create_engine(
            config.SQLALCHEMY_DATABASE_URI,
            pool_size=10,
            max_overflow=20,
            pool_recycle=3600,
            echo=False
        )

        # Step 3: Create tables (including users table)
        # Import User model to ensure it's registered with Base metadata
        from app.models.user import User
        Base.metadata.create_all(engine)

        SessionLocal = scoped_session(sessionmaker(bind=engine))
        print(f"[DB] Connected to MySQL: {config.MYSQL_DB}@{config.MYSQL_HOST}")
        print("[DB] Database initialized. Data will be populated via CSV uploads.")

        # Step 3b: Migrate legacy schema — customer_id used to be globally unique,
        # which prevented two users from owning the same customer_id. Switch to a
        # composite unique on (user_id, customer_id).
        _migrate_customer_unique_constraint()

        # Step 4: Seed default admin if users table is empty
        _seed_default_admin()

        return True
    except Exception as e:
        print(f"[DB WARNING] MySQL not available: {e}")
        print("[DB WARNING] Running in CSV-fallback mode.")
        return False


def _migrate_customer_unique_constraint():
    """
    Migrate the `customers` table from a global UNIQUE(customer_id) to a
    composite UNIQUE(user_id, customer_id). Idempotent and safe to run on
    every startup.
    """
    from sqlalchemy import text

    session = get_session()
    if session is None:
        return

    try:
        # Inspect existing indexes on the customers table
        rows = session.execute(text("SHOW INDEX FROM customers")).fetchall()
        # Each row: (Table, Non_unique, Key_name, Seq_in_index, Column_name, ...)
        index_columns = {}   # key_name -> list of (seq, column)
        index_unique = {}    # key_name -> is_unique (Non_unique == 0)
        for r in rows:
            key_name = r[2]
            non_unique = r[1]
            seq = r[3]
            col = r[4]
            index_columns.setdefault(key_name, []).append((seq, col))
            index_unique[key_name] = (int(non_unique) == 0)

        has_composite = False
        legacy_unique_keys = []

        for key_name, cols in index_columns.items():
            if key_name == 'PRIMARY':
                continue
            ordered = [c for _, c in sorted(cols)]
            is_unique = index_unique.get(key_name, False)
            if is_unique and ordered == ['user_id', 'customer_id']:
                has_composite = True
            # Legacy: a UNIQUE index solely on customer_id
            if is_unique and ordered == ['customer_id']:
                legacy_unique_keys.append(key_name)

        # Drop legacy global-unique index on customer_id
        for key_name in legacy_unique_keys:
            try:
                session.execute(text(f"ALTER TABLE customers DROP INDEX `{key_name}`"))
                print(f"[DB MIGRATION] Dropped legacy unique index '{key_name}' on customers.customer_id")
            except Exception as e:
                print(f"[DB MIGRATION WARNING] Could not drop index '{key_name}': {e}")

        # Add composite unique constraint if missing
        if not has_composite:
            try:
                session.execute(text(
                    "ALTER TABLE customers "
                    "ADD CONSTRAINT uq_user_customer UNIQUE (user_id, customer_id)"
                ))
                print("[DB MIGRATION] Added composite unique (user_id, customer_id) on customers")
            except Exception as e:
                print(f"[DB MIGRATION WARNING] Could not add composite unique: {e}")

        # Ensure a plain (non-unique) index remains on customer_id for lookups
        has_plain_cid_index = any(
            [c for _, c in sorted(cols)] == ['customer_id']
            for key_name, cols in index_columns.items()
            if key_name != 'PRIMARY'
        )
        if not has_plain_cid_index and not legacy_unique_keys:
            try:
                session.execute(text("CREATE INDEX ix_customers_customer_id ON customers (customer_id)"))
            except Exception:
                pass

        session.commit()
    except Exception as e:
        session.rollback()
        print(f"[DB MIGRATION WARNING] customer unique constraint migration skipped: {e}")
    finally:
        close_session(session)


def _seed_default_admin():
    """Create default admin user if users table is empty."""
    session = get_session()
    if session is None:
        return

    try:
        from app.models.user import User

        # Check if users table has any rows
        user_count = session.query(User).count()
        if user_count > 0:
            return

        # Read admin credentials from environment
        admin_email = os.getenv('ADMIN_EMAIL')
        admin_password = os.getenv('ADMIN_PASSWORD')

        if not admin_email or not admin_password:
            print("[DB WARNING] ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin seeding.")
            return

        # Hash password with bcrypt (cost factor 12)
        import bcrypt
        password_hash = bcrypt.hashpw(
            admin_password.encode('utf-8'),
            bcrypt.gensalt(rounds=12)
        ).decode('utf-8')

        # Create admin user
        admin_user = User(
            name='Admin',
            email=admin_email,
            password_hash=password_hash,
            role='admin',
            is_active=True
        )
        session.add(admin_user)
        session.commit()
        print(f"[DB] Default admin user created: {admin_email}")
    except Exception as e:
        session.rollback()
        print(f"[DB WARNING] Failed to seed admin user: {e}")
    finally:
        close_session(session)


def get_session():
    """Get a database session."""
    if SessionLocal is None:
        return None
    return SessionLocal()


def close_session(session):
    """Close a database session."""
    if session:
        session.close()
