-- Database Setup (SQL schema)
CREATE TABLE Students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    uid VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE Wallet (
    student_id INT PRIMARY KEY REFERENCES Students(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_positive_balance CHECK (balance >= 0)
);

CREATE TABLE Restrictions (
    student_id INT PRIMARY KEY REFERENCES Students(id) ON DELETE CASCADE,
    daily_limit DECIMAL(10, 2) DEFAULT 200.00,
    allergies TEXT,
    junk_food_block BOOLEAN DEFAULT FALSE
);

CREATE TABLE Transactions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES Students(id),
    item VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
