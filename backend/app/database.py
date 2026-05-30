"""
Database — SQLAlchemy models & MySQL connection.
Auto-creates database if it doesn't exist, then seeds from CSV.
"""

import os
import sys
import pymysql
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text,
    DateTime, Index
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
    customer_id = Column(String(20), unique=True, nullable=False, index=True)
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


class Prediction(Base):
    __tablename__ = 'predictions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(String(20), nullable=False, index=True)
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


def _seed_from_csv(session):
    """Seed database from merged_dataset.csv if table is empty."""
    import pandas as pd
    import numpy as np

    count = session.query(Customer).count()
    if count > 0:
        print(f"[DB] Customers table already has {count} rows. Skipping seed.")
        return

    if not os.path.exists(config.DATA_PATH):
        print(f"[DB] CSV not found at {config.DATA_PATH}. Skipping seed.")
        return

    print(f"[DB] Seeding from {config.DATA_PATH}...")
    df = pd.read_csv(config.DATA_PATH)

    # Map DataFrame columns to Customer model columns
    customer_columns = [c.name for c in Customer.__table__.columns if c.name not in ('id', 'risk_score', 'risk_class', 'uploaded_at')]

    inserted = 0
    for _, row in df.iterrows():
        data = {}
        for col in customer_columns:
            if col in row.index:
                val = row[col]
                # Handle NaN
                if pd.isna(val):
                    data[col] = None
                else:
                    data[col] = val
            else:
                data[col] = None

        customer = Customer(**data)
        session.add(customer)
        inserted += 1

        # Batch commit every 500 rows
        if inserted % 500 == 0:
            session.commit()

    session.commit()
    print(f"[DB] Seeded {inserted} customers from CSV.")


def init_db():
    """Initialize database connection, create tables, and seed if needed."""
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

        # Step 3: Create tables
        Base.metadata.create_all(engine)

        SessionLocal = scoped_session(sessionmaker(bind=engine))
        print(f"[DB] Connected to MySQL: {config.MYSQL_DB}@{config.MYSQL_HOST}")

        # Step 4: Seed from CSV if empty
        session = SessionLocal()
        try:
            _seed_from_csv(session)
        finally:
            session.close()

        return True
    except Exception as e:
        print(f"[DB WARNING] MySQL not available: {e}")
        print("[DB WARNING] Running in CSV-fallback mode.")
        return False


def get_session():
    """Get a database session."""
    if SessionLocal is None:
        return None
    return SessionLocal()


def close_session(session):
    """Close a database session."""
    if session:
        session.close()
