const express = require('express');
const next = require('next');
const auth = require('basic-auth');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

global.myConfig = {
    openAIKey: process.env.OPENAI_API_KEY
};


const basicAuthCheck = (req, res, next) => {
    const user = auth(req);
    const USERNAME = process.env.BASIC_AUTH_USERNAME;
    const PASSWORD = process.env.BASIC_AUTH_PASSWORD;

    if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        res.status(401).send('Authentication required.');
        return;
    }
    next();
};

app.prepare().then(() => {
    const server = express();

    // Apply basic auth check to all routes
    server.use(basicAuthCheck);

    server.all('*', (req, res) => {
        return handle(req, res);
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, err => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${PORT}`);
    });
});
