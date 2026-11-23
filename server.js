require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Static content (HTML, CSS, client-side JS) lives in /public
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
});