const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const PROJECT_DIR = __dirname;
const DIST_DIR = path.join(PROJECT_DIR, 'timetable-ui', 'dist');
const DATA_FILE = path.join(PROJECT_DIR, 'timetable.json');
const TMP_FILE = path.join(PROJECT_DIR, 'timetable.tmp.json');

// Generate local in-memory secret for this session
const SESSION_SECRET = crypto.randomBytes(16).toString('hex');

// --- Notification Logic ---
let lastNotifiedId = null;

function triggerNotification(phase, tasks) {
    const subtitle = Array.isArray(tasks) ? tasks[0] : (tasks || "");
    const script = `display notification "${phase}" with title "Epoch" subtitle "${subtitle}"`;
    spawn('osascript', ['-e', script]);
}

function checkSchedule() {
    if (!fs.existsSync(DATA_FILE)) return;
    
    try {
        const schedule = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const currentBlock = schedule.find(block => {
            return currentTime >= block.start && currentTime < block.end;
        });

        if (currentBlock && currentBlock.id !== lastNotifiedId) {
            triggerNotification(currentBlock.phase, currentBlock.tasks);
            lastNotifiedId = currentBlock.id;
        } else if (!currentBlock) {
            lastNotifiedId = null;
        }
    } catch (e) {
        console.error("Error in checkSchedule loop:", e);
    }
}

// Run check every 60 seconds
setInterval(checkSchedule, 60000);
// Initial check on start
checkSchedule();

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
    const fsItems = fs.readdirSync(PROJECT_DIR);
    const backups = fsItems
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
        // Auth Check
        if (req.headers['x-epoch-auth'] !== SESSION_SECRET) {
            res.writeHead(401);
            res.end('Unauthorized');
            return;
        }

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
                
                // Refresh local loop after save
                checkSchedule();
            } catch (e) {
                console.error(e);
                res.writeHead(400);
                res.end('Bad Request');
            }
        });
        return;
    }

    if (req.url === '/status' && req.method === 'GET') {
        if (!fs.existsSync(DATA_FILE)) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('⌛ No Active Block');
            return;
        }

        try {
            const schedule = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const timeToMinutes = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };

            const currentBlock = schedule.find(block => {
                const startMins = timeToMinutes(block.start);
                let endMins = timeToMinutes(block.end);
                
                // Handle midnight crossover for the active block detection
                if (endMins <= startMins) {
                    endMins += 1440;
                }
                
                // Current time could be before midnight or after midnight (in the crossover period)
                // If it's after midnight (e.g. 00:30) and the block is 23:00-01:00, 
                // currentMinutes is 30, but relative to this block it should be treated as 30 + 1440 = 1470
                let checkMins = currentMinutes;
                if (endMins > 1440 && currentMinutes < startMins) {
                    checkMins += 1440;
                }

                return checkMins >= startMins && checkMins < endMins;
            });

            if (currentBlock) {
                const startMins = timeToMinutes(currentBlock.start);
                let endMins = timeToMinutes(currentBlock.end);
                
                if (endMins <= startMins) {
                    endMins += 1440;
                }
                
                let checkMins = currentMinutes;
                if (endMins > 1440 && currentMinutes < startMins) {
                    checkMins += 1440;
                }

                const remainingMinutes = Math.round(endMins - checkMins);
                let timeStr = `${remainingMinutes}m`;
                if (remainingMinutes >= 60) {
                    const hours = Math.floor(remainingMinutes / 60);
                    const mins = remainingMinutes % 60;
                    timeStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                }

                res.writeHead(200, { 'Content-Type': 'text/plain' });
                // We assume currentBlock.phase already includes the emoji like "🚀 Ignition"
                res.end(`${currentBlock.phase} (${timeStr})`);
            } else {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('⌛ No Active Block');
            }
        } catch (e) {
            console.error(e);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error parsing schedule');
        }
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
            
            // Bootstrap Injection for index.html
            if (filePath.endsWith('index.html')) {
                let html = fs.readFileSync(filePath, 'utf8');
                html = html.replace('<head>', `<head><script>window.EPOCH_TOKEN = "${SESSION_SECRET}";</script>`);
                res.writeHead(200, headers);
                res.end(html);
                return;
            }
        }
        
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 53922; // Use a unique port to avoid conflicts
server.listen(PORT, '127.0.0.1', () => {
    console.log(`Epoch persistent service running at http://127.0.0.1:${PORT}`);
});

