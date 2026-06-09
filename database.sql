-- CampusOne Cashless System - Parent Portal Database Schema

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
    parent_id INT NOT NULL REFERENCES Parents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    campus_pin VARCHAR(4) NOT NULL CHECK (campus_pin ~ '^[0-9]{4}$'), -- Enforce 4-digit PIN
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Wallet Table
CREATE TABLE Wallet (
    student_id INT PRIMARY KEY REFERENCES Students(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_positive_balance CHECK (balance >= 0.00)
);

-- Index for faster student lookup by parent
CREATE INDEX idx_students_parent ON Students(parent_id);
