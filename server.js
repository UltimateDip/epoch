const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = __dirname;
const DIST_DIR = path.join(PROJECT_DIR, 'timetable-ui', 'dist');
const DATA_FILE = path.join(PROJECT_DIR, 'timetable.json');
const TMP_FILE = path.join(PROJECT_DIR, 'timetable.tmp.json');

// --- Input Sanitization Utilities ---
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, function(match) {
        const escapeParams = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escapeParams[match];
    });
}

function sanitizeObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    } else if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
    } else if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    return obj;
}

// --- Backup Utilities ---
function handleBackup(currentDataStr) {
    const backups = fs.readdirSync(PROJECT_DIR)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .map(f => {
            const stat = fs.statSync(path.join(PROJECT_DIR, f));
            return { name: f, path: path.join(PROJECT_DIR, f), time: stat.mtimeMs };
        })
        .sort((a, b) => b.time - a.time);

    const now = Date.now();

    if (backups.length > 0) {
        const latest = backups[0];
        if (now - latest.time < 60 * 60 * 1000) {
            fs.writeFileSync(latest.path, currentDataStr);
            return;
        }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newBackup = path.join(PROJECT_DIR, `backup_${timestamp}.json`);
    fs.writeFileSync(newBackup, currentDataStr);

    const updatedBackups = fs.readdirSync(PROJECT_DIR)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .map(f => {
            const stat = fs.statSync(path.join(PROJECT_DIR, f));
            return { path: path.join(PROJECT_DIR, f), time: stat.mtimeMs };
        })
        .sort((a, b) => b.time - a.time);

    if (updatedBackups.length > 3) {
        for (let i = 3; i < updatedBackups.length; i++) {
            fs.unlinkSync(updatedBackups[i].path);
        }
    }
}

// --- Heartbeat state ---
let activeConnections = 0;
let shutdownTimer = null;

function resetShutdownTimer() {
    if (shutdownTimer) clearTimeout(shutdownTimer);
    shutdownTimer = setTimeout(() => {
        if (activeConnections === 0) {
            console.log("No active SSE connections for 30s. Triggering auto-shutdown.");
            process.exit(0);
        }
    }, 30000);
}

// Ensure the server auto-shuts down if the browser never opens
resetShutdownTimer();

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // --- SSE Heartbeat Endpoint ---
    if (req.url === '/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        
        activeConnections++;
        if (shutdownTimer) clearTimeout(shutdownTimer);

        res.write('data: connected\n\n');

        // Send a ping every 10 seconds to keep connection alive
        const pingInterval = setInterval(() => {
            res.write('data: ping\n\n');
        }, 10000);

        req.on('close', () => {
            clearInterval(pingInterval);
            activeConnections--;
            if (activeConnections <= 0) {
                activeConnections = 0;
                resetShutdownTimer();
            }
        });
        return;
    }

    // --- Data Endpoints ---
    if (req.url === '/data' && req.method === 'GET') {
        if (fs.existsSync(DATA_FILE)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(fs.readFileSync(DATA_FILE));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
        return;
    }

    if (req.url === '/data' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                const sanitized = sanitizeObject(parsed);
                const sanitizedStr = JSON.stringify(sanitized, null, 2);
                
                // Atomic file write using rename
                fs.writeFileSync(TMP_FILE, sanitizedStr);
                fs.renameSync(TMP_FILE, DATA_FILE);
                
                handleBackup(sanitizedStr);
                
                res.writeHead(200);
                res.end('Saved');
            } catch (e) {
                console.error(e);
                res.writeHead(400);
                res.end('Bad Request');
            }
        });
        return;
    }

    // --- Static File Serving ---
    let reqUrl = req.url === '/' ? '/index.html' : req.url;
    
    // Normalize and remove leading slash to join correctly as relative
    let relativePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
    if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
        relativePath = relativePath.substring(1);
    }
    
    let filePath = path.join(DIST_DIR, relativePath);
    
    // Fallback to index.html for Single Page App routing (extension-less routes only)
    if (!path.extname(relativePath)) {
        filePath = path.join(DIST_DIR, 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const extname = String(path.extname(filePath)).toLowerCase();
        const headers = { 'Content-Type': mimeTypes[extname] || 'application/octet-stream' };
        
        // Force revalidation for index.html to avoid stale hashes
        if (extname === '.html') {
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            headers['Pragma'] = 'no-cache';
            headers['Expires'] = '0';
        }
        
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 0;
server.listen(PORT, '127.0.0.1', () => {
    const port = server.address().port;
    console.log(`Server dynamically launched at http://127.0.0.1:${port}`);
});
