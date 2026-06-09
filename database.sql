-- CampusOne Cashless System - Unified Database Schema

-- 1. Parents Table
CREATE TABLE Parents (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Table
CREATE TABLE Students (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES Parents(id) ON DELETE CASCADE, -- Nullable so Admin can register card first
    name VARCHAR(255) NOT NULL,
    uid VARCHAR(50) UNIQUE, -- NFC Card Hardware UID
    campus_pin VARCHAR(4) CHECK (campus_pin ~ '^[0-9]{4}$'), -- Enforce 4-digit PIN
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Wallet Table
CREATE TABLE Wallet (
    student_id INT PRIMARY KEY REFERENCES Students(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_positive_balance CHECK (balance >= 0.00)
);

-- 4. Transactions Table
CREATE TABLE Transactions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES Students(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_positive_amount CHECK (amount >= 0.00)
);

-- Index for faster student lookups
CREATE INDEX idx_students_parent ON Students(parent_id);
CREATE INDEX idx_students_uid ON Students(uid);
