const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serves static files (index.html, canteen.html, admin.html) from root

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
    students: {}, // parentId or studentId -> { id, parent_id, name, campus_pin, uid }
    wallets: {}, // studentId -> { balance }
    transactions: [], // list of transactions { id, student_id, item, amount, date }
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
    campus_pin: '4321',
    uid: '123456789'
};
mockStore.wallets[1] = { balance: 100.00 };
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
            if (!parent) {
                const newId = mockStore.nextId++;
                parent = { id: newId, email: email.toLowerCase(), password };
                mockStore.parents[email.toLowerCase()] = parent;
                console.log(`[Simulator] Auto-registered parent: ${email}`);
            } else if (parent.password !== password) {
                return res.status(401).json({ success: false, error: 'Incorrect password.' });
            }

            // Get linked student and wallet
            let student = null;
            for (let parentId in mockStore.students) {
                if (mockStore.students[parentId].parent_id === parent.id) {
                    student = { ...mockStore.students[parentId] };
                    student.balance = mockStore.wallets[student.id]?.balance || 0.00;
                    break;
                }
            }

            return res.json({ success: true, parentId: parent.id, email: parent.email, student });
        } else {
            // PostgreSQL query
            let result = await pool.query('SELECT * FROM Parents WHERE LOWER(email) = LOWER($1)', [email]);
            let parent = result.rows[0];

            if (!parent) {
                const insertResult = await pool.query(
                    'INSERT INTO Parents (email, password) VALUES ($1, $2) RETURNING id, email',
                    [email, password]
                );
                parent = insertResult.rows[0];
                console.log(`[Postgres] Auto-registered parent: ${email}`);
            } else if (parent.password !== password) {
                return res.status(401).json({ success: false, error: 'Incorrect password.' });
            }

            // Get linked student with wallet balance
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

// 2. Parent Consolidated Subscription Setup
app.post('/api/parent/setup-subscription', async (req, res) => {
    const { parentId, studentName, pin, confirmPin } = req.body;

    if (!parentId || !studentName || !studentName.trim() || !pin || !confirmPin) {
        return res.status(400).json({ success: false, error: 'All subscription fields are required.' });
    }

    if (pin !== confirmPin) {
        return res.status(400).json({ success: false, error: 'PIN and Confirm PIN do not match.' });
    }

    if (!/^[0-9]{4}$/.test(pin)) {
        return res.status(400).json({ success: false, error: 'PIN must be exactly 4 numeric digits.' });
    }

    try {
        if (useMock) {
            // Find existing student for parent
            let student = null;
            for (let pid in mockStore.students) {
                if (mockStore.students[pid].parent_id === Number(parentId)) {
                    student = mockStore.students[pid];
                    break;
                }
            }

            // Fallback: search student by name with no parent linked (assigned by admin beforehand)
            if (!student) {
                for (let sid in mockStore.students) {
                    if (mockStore.students[sid].name.toLowerCase() === studentName.trim().toLowerCase() && !mockStore.students[sid].parent_id) {
                        student = mockStore.students[sid];
                        student.parent_id = Number(parentId);
                        break;
                    }
                }
            }

            if (!student) {
                const studentId = mockStore.nextId++;
                student = {
                    id: studentId,
                    parent_id: Number(parentId),
                    name: studentName.trim(),
                    campus_pin: pin,
                    uid: null
                };
                mockStore.students[studentId] = student;
                mockStore.wallets[studentId] = { balance: 0.00 };
            } else {
                student.name = studentName.trim();
                student.campus_pin = pin;
            }

            student.balance = mockStore.wallets[student.id].balance;
            console.log(`[Simulator] Set subscription for parent ID ${parentId}: ${student.name}`);
            return res.json({ success: true, student });
        } else {
            // PostgreSQL operations
            // Check if parent already has a student
            const check = await pool.query('SELECT id FROM Students WHERE parent_id = $1', [parentId]);
            let student;

            if (check.rows.length === 0) {
                // Check if admin registered student by name first
                const nameCheck = await pool.query(
                    'SELECT id FROM Students WHERE LOWER(name) = LOWER($1) AND parent_id IS NULL',
                    [studentName.trim()]
                );

                if (nameCheck.rows.length > 0) {
                    // Link and update existing student
                    const updateRes = await pool.query(
                        'UPDATE Students SET parent_id = $1, campus_pin = $2 WHERE id = $3 RETURNING *',
                        [parentId, pin, nameCheck.rows[0].id]
                    );
                    student = updateRes.rows[0];
                } else {
                    // Insert new student
                    const insert = await pool.query(
                        'INSERT INTO Students (parent_id, name, campus_pin) VALUES ($1, $2, $3) RETURNING *',
                        [parentId, studentName.trim(), pin]
                    );
                    student = insert.rows[0];
                    // Create wallet
                    await pool.query('INSERT INTO Wallet (student_id, balance) VALUES ($1, 0.00)', [student.id]);
                }
            } else {
                // Update existing student
                const update = await pool.query(
                    'UPDATE Students SET name = $1, campus_pin = $2 WHERE parent_id = $3 RETURNING *',
                    [studentName.trim(), pin, parentId]
                );
                student = update.rows[0];
            }

            // Fetch balance
            const balanceRes = await pool.query('SELECT balance FROM Wallet WHERE student_id = $1', [student.id]);
            student.balance = balanceRes.rows[0]?.balance || 0.00;

            console.log(`[Postgres] Set subscription for parent ID ${parentId}: ${student.name}`);
            return res.json({ success: true, student });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database subscription error.' });
    }
});

// 3. Parent Wallet Top-up
app.post('/api/parent/topup', async (req, res) => {
    const { parentId, amount } = req.body;

    if (!parentId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid Parent ID and positive amount are required.' });
    }

    try {
        if (useMock) {
            // Find student linked to parent
            let student = null;
            for (let pid in mockStore.students) {
                if (mockStore.students[pid].parent_id === Number(parentId)) {
                    student = mockStore.students[pid];
                    break;
                }
            }

            if (!student) {
                return res.status(404).json({ success: false, error: 'No student associated with this parent account.' });
            }

            mockStore.wallets[student.id].balance += Number(amount);
            console.log(`[Simulator] Loaded ₹${amount} for parent ID ${parentId}`);
            return res.json({ success: true, newBalance: mockStore.wallets[student.id].balance });
        } else {
            // Postgres operations
            const studentRes = await pool.query('SELECT id FROM Students WHERE parent_id = $1', [parentId]);
            const student = studentRes.rows[0];

            if (!student) {
                return res.status(404).json({ success: false, error: 'No student associated with this parent account.' });
            }

            // Update balance
            const updateRes = await pool.query(
                'UPDATE Wallet SET balance = balance + $1 WHERE student_id = $2 RETURNING balance',
                [amount, student.id]
            );

            console.log(`[Postgres] Loaded ₹${amount} for parent ID ${parentId}`);
            return res.json({ success: true, newBalance: updateRes.rows[0].balance });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database top-up error.' });
    }
});

// 4. ADMIN PANEL: Register/Assign card UID to a student
app.post('/api/admin/register-card', async (req, res) => {
    const { studentName, cardUid } = req.body;

    if (!studentName || !cardUid) {
        return res.status(400).json({ success: false, error: 'Student name and card UID are required.' });
    }

    try {
        if (useMock) {
            // Check if student with name exists and doesn't have a UID yet
            let student = null;
            for (let sid in mockStore.students) {
                if (mockStore.students[sid].name.toLowerCase() === studentName.trim().toLowerCase() && !mockStore.students[sid].uid) {
                    student = mockStore.students[sid];
                    break;
                }
            }

            if (student) {
                student.uid = cardUid;
            } else {
                // Create brand new student
                const studentId = mockStore.nextId++;
                student = {
                    id: studentId,
                    parent_id: null,
                    name: studentName.trim(),
                    campus_pin: null,
                    uid: cardUid
                };
                mockStore.students[studentId] = student;
                mockStore.wallets[studentId] = { balance: 0.00 };
            }

            console.log(`[Simulator] Assigned UID ${cardUid} to student "${student.name}"`);
            return res.json({ success: true, message: 'Card assigned successfully!' });
        } else {
            // Check if student exists by name without UID
            const nameCheck = await pool.query(
                'SELECT id FROM Students WHERE LOWER(name) = LOWER($1) AND uid IS NULL',
                [studentName.trim()]
            );

            if (nameCheck.rows.length > 0) {
                // Link UID to existing student
                await pool.query(
                    'UPDATE Students SET uid = $1 WHERE id = $2',
                    [cardUid, nameCheck.rows[0].id]
                );
            } else {
                // Insert new student
                const insert = await pool.query(
                    'INSERT INTO Students (name, uid) VALUES ($1, $2) RETURNING id',
                    [studentName.trim(), cardUid]
                );
                const studentId = insert.rows[0].id;
                // Create wallet
                await pool.query('INSERT INTO Wallet (student_id, balance) VALUES ($1, 0.00)', [studentId]);
            }

            console.log(`[Postgres] Assigned UID ${cardUid} to student "${studentName.trim()}"`);
            return res.json({ success: true, message: 'Card assigned successfully!' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database card registration error.' });
    }
});

// 5. CANTEEN PANEL: Process cashless checkout terminal deduction
app.post('/api/canteen/pay', async (req, res) => {
    const { cardUid, item, amount } = req.body;

    if (!cardUid || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid card UID and price are required.' });
    }

    try {
        if (useMock) {
            // Find student by UID
            let student = null;
            for (let sid in mockStore.students) {
                if (mockStore.students[sid].uid === cardUid) {
                    student = mockStore.students[sid];
                    break;
                }
            }

            if (!student) {
                return res.status(404).json({ success: false, error: 'Unknown student NFC card.' });
            }

            const currentBalance = mockStore.wallets[student.id].balance;
            if (currentBalance < amount) {
                return res.status(400).json({ success: false, error: 'Insufficient wallet funds.' });
            }

            mockStore.wallets[student.id].balance -= Number(amount);
            mockStore.transactions.push({
                id: mockStore.nextId++,
                student_id: student.id,
                item: item || 'Canteen Item',
                amount: Number(amount),
                date: new Date()
            });

            console.log(`[Simulator] POS payment approved: ${student.name} spent ₹${amount}`);
            return res.json({ success: true, studentName: student.name, remainingBalance: mockStore.wallets[student.id].balance });
        } else {
            // PostgreSQL transaction checkout
            const studentRes = await pool.query(
                `SELECT s.id, s.name, w.balance 
                 FROM Students s 
                 JOIN Wallet w ON s.id = w.student_id 
                 WHERE s.uid = $1`, [cardUid]
            );

            const student = studentRes.rows[0];
            if (!student) {
                return res.status(404).json({ success: false, error: 'Unknown student NFC card.' });
            }

            if (parseFloat(student.balance) < amount) {
                return res.status(400).json({ success: false, error: 'Insufficient wallet funds.' });
            }

            // Execute transaction safely inside SQL block
            await pool.query('BEGIN');
            await pool.query('UPDATE Wallet SET balance = balance - $1 WHERE student_id = $2', [amount, student.id]);
            await pool.query(
                'INSERT INTO Transactions (student_id, item, amount) VALUES ($1, $2, $3)',
                [student.id, item || 'Canteen Item', amount]
            );
            await pool.query('COMMIT');

            const remainingBalance = parseFloat(student.balance) - amount;
            console.log(`[Postgres] POS payment approved: ${student.name} spent ₹${amount}`);
            return res.json({ success: true, studentName: student.name, remainingBalance });
        }
    } catch (err) {
        if (!useMock) await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ success: false, error: 'Database transaction failed.' });
    }
});

// Serve the index.html fallback for client-side routing
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`🚀 Parent Portal Server live at http://localhost:${PORT}`));
