const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client tool
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serves the index.html frontend file automatically

const pool = new Pool({
    connectionString: process.env.DATABASE_URL // Secure link to cloud database
});

app.post('/api/pay', async (req, res) => {
    const { cardUid, amount } = req.body;

    try {
        // Query database to match manufacturer UID to student and check wallet restrictions
        const query = `
            SELECT s.id, s.name, w.balance 
            FROM Students s 
            JOIN Wallet w ON s.id = w.student_id 
            WHERE s.uid = $1`;
        
        const userCheck = await pool.query(query, [cardUid]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Card UID not registered in system." });
        }

        const student = userCheck.rows[0];

        if (parseFloat(student.balance) < amount) {
            return res.status(400).json({ success: false, error: "Insufficient wallet funds." });
        }

        // Execute transaction deduct safely using database blocks
        await pool.query('BEGIN');
        await pool.query('UPDATE Wallet SET balance = balance - $1 WHERE student_id = $2', [amount, student.id]);
        await pool.query('INSERT INTO Transactions (student_id, item, amount) VALUES ($1, $2, $3)', [student.id, 'Canteen Item', amount]);
        await pool.query('COMMIT');

        const finalBalance = parseFloat(student.balance) - amount;
        res.json({ success: true, studentName: student.name, newBalance: finalBalance.toFixed(2) });

    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ success: false, error: "Database error processing transaction." });
    }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Portal online at port ${PORT}`));
