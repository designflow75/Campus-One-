const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serves index.html statically from root

// --- Database Configuration ---
const dbUrl = process.env.DATABASE_URL;
let pool = null;
let useMock = false;

if (dbUrl) {
    pool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    // Test the database connection on startup
    pool.query('SELECT NOW()')
        .then(() => console.log('✅ PostgreSQL database connected successfully.'))
        .catch(err => {
            console.error('❌ PostgreSQL connection failed. Falling back to in-memory Simulator Mode.', err.message);
            useMock = true;
        });
} else {
    console.log('⚠️ No DATABASE_URL found. Running in in-memory Simulator Mode.');
    useMock = true;
}

// --- Simulator Mode In-Memory Store ---
const mockStore = {
    parents: {}, // email -> { id, email, password }
    students: {}, // parentId -> { id, parent_id, name, campus_pin }
    wallets: {}, // studentId -> { balance }
    nextId: 1
};

// Seed mock user for quick testing
mockStore.parents['parent@gmail.com'] = {
    id: 1,
    email: 'parent@gmail.com',
    password: 'parent123'
};
mockStore.students[1] = {
    id: 1,
    parent_id: 1,
    name: 'Alex Mercer',
    campus_pin: '4321'
};
mockStore.wallets[1] = { balance: 0.00 };
mockStore.nextId = 2;

// --- API Endpoints ---

// 1. Parent Authentication (Login / Auto-Register)
app.post('/api/parent/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
        if (useMock) {
            let parent = mockStore.parents[email.toLowerCase()];
            // Auto-register if not found for easy prototype testing
            if (!parent) {
                const newId = mockStore.nextId++;
                parent = { id: newId, email: email.toLowerCase(), password };
                mockStore.parents[email.toLowerCase()] = parent;
                console.log(`[Simulator] Auto-registered parent: ${email}`);
            } else if (parent.password !== password) {
                return res.status(401).json({ success: false, error: 'Incorrect password.' });
            }

            // Get linked student
            const student = mockStore.students[parent.id] || null;
            if (student) {
                student.balance = mockStore.wallets[student.id]?.balance || 0.00;
            }
            return res.json({ success: true, parentId: parent.id, email: parent.email, student });
        } else {
            // PostgreSQL query
            let result = await pool.query('SELECT * FROM Parents WHERE LOWER(email) = LOWER($1)', [email]);
            let parent = result.rows[0];

            if (!parent) {
                // Auto-register new parent
                const insertResult = await pool.query(
                    'INSERT INTO Parents (email, password) VALUES ($1, $2) RETURNING id, email',
                    [email, password]
                );
                parent = insertResult.rows[0];
                console.log(`[Postgres] Auto-registered parent: ${email}`);
            } else if (parent.password !== password) {
                return res.status(401).json({ success: false, error: 'Incorrect password.' });
            }

            // Get linked student and balance
            const studentResult = await pool.query(
                `SELECT s.*, COALESCE(w.balance, 0.00) as balance 
                 FROM Students s 
                 LEFT JOIN Wallet w ON s.id = w.student_id 
                 WHERE s.parent_id = $1`, [parent.id]);
            const student = studentResult.rows[0] || null;

            return res.json({ success: true, parentId: parent.id, email: parent.email, student });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database authentication error.' });
    }
});

// 2. Setup / Update Student Profile Name
app.post('/api/parent/setup-profile', async (req, res) => {
    const { parentId, studentName } = req.body;

    if (!parentId || !studentName || !studentName.trim()) {
        return res.status(400).json({ success: false, error: 'Parent ID and Student Name are required.' });
    }

    try {
        if (useMock) {
            let student = mockStore.students[parentId];
            if (!student) {
                const studentId = mockStore.nextId++;
                student = { id: studentId, parent_id: Number(parentId), name: studentName.trim(), campus_pin: '0000' };
                mockStore.students[parentId] = student;
                mockStore.wallets[studentId] = { balance: 0.00 };
            } else {
                student.name = studentName.trim();
            }
            student.balance = mockStore.wallets[student.id]?.balance || 0.00;
            console.log(`[Simulator] Set student name: "${student.name}" for parent ID ${parentId}`);
            return res.json({ success: true, student });
        } else {
            // PostgreSQL upsert (check if student exists for this parent)
            const check = await pool.query('SELECT id FROM Students WHERE parent_id = $1', [parentId]);
            let student;

            if (check.rows.length === 0) {
                // Create student & initialize wallet
                const insert = await pool.query(
                    "INSERT INTO Students (parent_id, name, campus_pin) VALUES ($1, $2, '0000') RETURNING *",
                    [parentId, studentName.trim()]
                );
                student = insert.rows[0];
                await pool.query('INSERT INTO Wallet (student_id, balance) VALUES ($1, 0.00)', [student.id]);
            } else {
                // Update name
                const update = await pool.query(
                    'UPDATE Students SET name = $1 WHERE parent_id = $2 RETURNING *',
                    [studentName.trim(), parentId]
                );
                student = update.rows[0];
            }

            const balanceRes = await pool.query('SELECT balance FROM Wallet WHERE student_id = $1', [student.id]);
            student.balance = balanceRes.rows[0]?.balance || 0.00;

            console.log(`[Postgres] Set student name: "${student.name}" for parent ID ${parentId}`);
            return res.json({ success: true, student });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database profile error.' });
    }
});

// 3. Setup / Update Campus PIN
app.post('/api/parent/setup-pin', async (req, res) => {
    const { parentId, pin } = req.body;

    if (!parentId || !pin || !/^[0-9]{4}$/.test(pin)) {
        return res.status(400).json({ success: false, error: 'Parent ID and a 4-digit numeric PIN are required.' });
    }

    try {
        if (useMock) {
            let student = mockStore.students[parentId];
            if (!student) {
                return res.status(404).json({ success: false, error: 'Please set the student name first before configuring a PIN.' });
            }
            student.campus_pin = pin;
            student.balance = mockStore.wallets[student.id]?.balance || 0.00;
            console.log(`[Simulator] Set campus PIN for parent ID ${parentId}`);
            return res.json({ success: true, student });
        } else {
            // PostgreSQL update pin
            const check = await pool.query('SELECT id FROM Students WHERE parent_id = $1', [parentId]);
            if (check.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Please set the student name first before configuring a PIN.' });
            }

            const update = await pool.query(
                'UPDATE Students SET campus_pin = $1 WHERE parent_id = $2 RETURNING *',
                [pin, parentId]
            );
            const student = update.rows[0];

            const balanceRes = await pool.query('SELECT balance FROM Wallet WHERE student_id = $1', [student.id]);
            student.balance = balanceRes.rows[0]?.balance || 0.00;

            console.log(`[Postgres] Set campus PIN for parent ID ${parentId}`);
            return res.json({ success: true, student });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database PIN error.' });
    }
});

// 4. Parent Wallet Top-up
app.post('/api/parent/topup', async (req, res) => {
    const { parentId, amount } = req.body;

    if (!parentId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Parent ID and a positive top-up amount are required.' });
    }

    try {
        if (useMock) {
            let student = mockStore.students[parentId];
            if (!student) {
                return res.status(404).json({ success: false, error: 'No student profile linked to this parent account.' });
            }
            mockStore.wallets[student.id].balance += Number(amount);
            console.log(`[Simulator] Loaded ₹${amount} into student wallet.`);
            return res.json({ success: true, newBalance: mockStore.wallets[student.id].balance });
        } else {
            // PostgreSQL update wallet balance
            const studentCheck = await pool.query('SELECT id FROM Students WHERE parent_id = $1', [parentId]);
            const student = studentCheck.rows[0];

            if (!student) {
                return res.status(404).json({ success: false, error: 'No student profile linked to this parent account.' });
            }

            const updateRes = await pool.query(
                'UPDATE Wallet SET balance = balance + $1 WHERE student_id = $2 RETURNING balance',
                [amount, student.id]
            );

            console.log(`[Postgres] Loaded ₹${amount} into student wallet.`);
            return res.json({ success: true, newBalance: updateRes.rows[0].balance });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database top-up error.' });
    }
});

// Serve the index.html fallback for client-side routing
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`🚀 Parent Portal Server live at http://localhost:${PORT}`));
