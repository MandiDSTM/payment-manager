const app = require('./app');

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`>>> [INFO] Server started on http://localhost:${PORT}`);
});
