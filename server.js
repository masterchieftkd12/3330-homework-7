require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool, types } = require("pg");

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JS Date objects,
// so the "Joined" date is not shifted by the server's time zone.
types.setTypeParser(1082, (value) => value);

const app = express();
const PORT = process.env.PORT || 3000;

// Connection settings come from .env (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD)
const pool = new Pool({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || "dashboard",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD
});

// Static content (HTML, CSS, client-side JS) lives in /public
app.use(express.static(path.join(__dirname, "public")));

// Small helper so every route handles database errors the same way
const route = (handler) => async (req, res) => {
    try {
        res.json(await handler(req));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
};

// ---------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------

// Query 1: total number of customers
app.get("/api/customers/count", route(async () => {
    const result = await pool.query("SELECT count(*) FROM customers");
    return { count: Number(result.rows[0].count) };
}));

// Query 2: one page of customers (?page=1&limit=10)
app.get("/api/customers", route(async (req) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    const [rows, total] = await Promise.all([
        pool.query("SELECT * FROM customers ORDER BY id LIMIT $1 OFFSET $2", [limit, offset]),
        pool.query("SELECT count(*) FROM customers")
    ]);

    const count = Number(total.rows[0].count);
    return {
        page,
        limit,
        total: count,
        totalPages: Math.max(Math.ceil(count / limit), 1),
        customers: rows.rows
    };
}));

// ---------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------

// Query 3: total revenue
app.get("/api/sales/revenue", route(async () => {
    const result = await pool.query("SELECT sum(saleamount) FROM sales");
    return { revenue: Number(result.rows[0].sum) || 0 };
}));

// Query 4: all sales with the product name instead of the product id
app.get("/api/sales", route(async () => {
    const result = await pool.query(`
        SELECT products.name, sales.quantity, sales.saleamount
        FROM sales
        LEFT JOIN products ON
        sales.productid = products.id
        ORDER BY sales.id ASC`);
    return result.rows;
}));

// ---------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------

// Query 5: number of orders
app.get("/api/orders/count", route(async () => {
    const result = await pool.query("SELECT count(quantity) FROM orders");
    return { count: Number(result.rows[0].count) };
}));

// ---------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------

// Query 6: number of issues
app.get("/api/alerts/issues/count", route(async () => {
    const result = await pool.query("SELECT count(id) FROM alerts WHERE type = 'issues'");
    return { count: Number(result.rows[0].count) };
}));

// Query 7: all issues
app.get("/api/alerts/issues", route(async () => {
    const result = await pool.query("SELECT * FROM alerts WHERE type = 'issues'");
    return result.rows;
}));

// Query 8: number of notifications
app.get("/api/alerts/notifications/count", route(async () => {
    const result = await pool.query("SELECT count(id) FROM alerts WHERE type = 'notifications'");
    return { count: Number(result.rows[0].count) };
}));

// Query 9: all notifications
app.get("/api/alerts/notifications", route(async () => {
    const result = await pool.query("SELECT * FROM alerts WHERE type = 'notifications'");
    return result.rows;
}));

// Query 10: all tasks
app.get("/api/alerts/tasks", route(async () => {
    const result = await pool.query("SELECT * FROM alerts WHERE type = 'tasks'");
    return result.rows;
}));

app.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
});