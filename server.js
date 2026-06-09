const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // PostgreSQL client

const app = express();
app.use(cors());
app.use(express.json());

// Cloud Database Connection config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Managed secure database string
});

// 1. ADMIN PANEL: Register/Assign a brand new card UID to a student
app.post('/api/admin/register-card', async (req, res) => {
  const { studentName, cardUid } = req.body; // Fixed bug: changed req.req.body to req.body
  try {
    // Insert new student mapping
    const studentRes = await pool.query(
      'INSERT INTO Students (name, uid) VALUES ($1, $2) RETURNING id',
      [studentName, cardUid]
    );
    const studentId = studentRes.rows[0].id;

    // Initialize their empty parent wallet profile
    await pool.query('INSERT INTO Wallet (student_id, balance) VALUES ($1, 0.00)', [studentId]);
    // Set baseline restriction guardrails
    await pool.query('INSERT INTO Restrictions (student_id) VALUES ($1)', [studentId]);

    res.status(201).json({ success: true, message: "Card assigned successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CANTEEN PANEL: Process instantaneous checkout payment on Card Tap
app.post('/api/canteen/pay', async (req, res) => {
  const { cardUid, item, amount } = req.body;
  try {
    // Fetch student data using the manufacturer UID
    const checkUser = await pool.query(
      `SELECT s.id, s.name, w.balance, r.daily_limit, r.junk_food_block 
       FROM Students s
       JOIN Wallet w ON s.id = w.student_id
       JOIN Restrictions r ON s.id = r.student_id
       WHERE s.uid = $1`, [cardUid]
    );

    if (checkUser.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Unknown NFC Card." });
    }

    const student = checkUser.rows[0];

    // Check balance guardrails
    if (parseFloat(student.balance) < amount) {
      return res.status(400).json({ success: false, error: "Insufficient wallet funds." });
    }

    // Process deduction transaction block safely
    await pool.query('BEGIN');
    await pool.query('UPDATE Wallet SET balance = balance - $1 WHERE student_id = $2', [amount, student.id]);
    await pool.query('INSERT INTO Transactions (student_id, item, amount) VALUES ($1, $2, $3)', [student.id, item, amount]);
    await pool.query('COMMIT');

    // Trigger parental push update payload simulation
    console.log(`Notification sent to Parent: ${student.name} bought ${item} for ₹${amount}`);

    res.json({ success: true, studentName: student.name, remainingBalance: student.balance - amount });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// 3. PARENT DASHBOARD API: Fetch real-time metrics remotely
app.get('/api/parent/student/:id', async (req, res) => {
  try {
    const data = await pool.query(
      `SELECT s.name, w.balance, r.daily_limit, r.junk_food_block
       FROM Students s 
       JOIN Wallet w ON s.id = w.student_id
       JOIN Restrictions r ON s.id = r.student_id
       WHERE s.id = $1`, [req.params.id]
    );
    res.json(data.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Using port 3002 by default to prevent port conflicts with local dev servers (Next.js is on 3000, NestJS is on 3001)
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`CampusOne Express Server spinning on port ${PORT}`));
