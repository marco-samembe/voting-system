const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// ============================================================
// CACHE CONTROL & NGROK WARNING REMOVAL
// ============================================================
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('ngrok-skip-browser-warning', 'true');
    
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

const DB_FILE = path.join(__dirname, 'db.json');
let clients = [];

// ============================================================
// FILE UPLOAD CONFIGURATION
// ============================================================
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'candidate-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed (JPEG, PNG, GIF, WEBP)'));
        }
    }
});

// ============================================================
// SSE - Server Sent Events
// ============================================================
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('ngrok-skip-browser-warning', 'true');

    const clientId = Date.now();
    const newClient = { id: clientId, res: res };
    clients.push(newClient);
    console.log(`✅ Client ${clientId} connected. Total clients: ${clients.length}`);

    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to live updates' })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
        console.log(`❌ Client ${clientId} disconnected. Total clients: ${clients.length}`);
    });
});

function broadcastUpdate(data) {
    const message = `data: ${JSON.stringify({ type: 'update', timestamp: Date.now(), ...data })}\n\n`;
    clients.forEach(client => {
        try {
            client.res.write(message);
        } catch (err) {
            clients = clients.filter(c => c.id !== client.id);
        }
    });
    console.log(`📡 Broadcasted update to ${clients.length} clients`);
}

// ============================================================
// DATABASE
// ============================================================
function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return initDB();
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) { return initDB(); }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    console.log('💾 Data saved to db.json');
    broadcastUpdate({ action: 'data_updated', timestamp: new Date().toISOString() });
}

function initDB() {
    const data = {
        election: { 
            title: 'Uchaguzi wa Viongozi wa hosteli 2026', 
            status: 'open',
            description: 'Uchaguzi wa viongozi wa hosteli mwaka 2026',
            startDate: '2026-06-20T08:00:00',
            endDate: '2026-06-25T17:00:00'
        },
        settings: { resultsAccess: false },
        roles: ['Head of Hostels', 'Girls Representative', 'Boys Representative', 'Academic Representative', 'Sports Representative'],
        candidates: [
            { id: '1', name: 'Baraka Msigwa', role: 'Head of Hostels', party: 'Chama cha Maendeleo', image: 'https://i.pravatar.cc/150?img=1', votes: 0, hidden: false },
            { id: '2', name: 'Rehema Lyimo', role: 'Head of Hostels', party: 'Chama cha Wanawake', image: 'https://i.pravatar.cc/150?img=5', votes: 0, hidden: false },
            { id: '3', name: 'Daniel Chuma', role: 'Head of Hostels', party: 'Chama cha Vijana', image: 'https://i.pravatar.cc/150?img=3', votes: 0, hidden: false },
            { id: '4', name: 'Salma Juma', role: 'Head of Hostels', party: 'Chama cha Wazazi', image: 'https://i.pravatar.cc/150?img=10', votes: 0, hidden: false },
            { id: '5', name: 'Peter Nkosi', role: 'Head of Hostels', party: 'Chama cha Wananchi', image: 'https://i.pravatar.cc/150?img=12', votes: 0, hidden: false },
            { id: '6', name: 'Grace Kapinga', role: 'Girls Representative', party: 'Chama cha Wanawake', image: 'https://i.pravatar.cc/150?img=25', votes: 0, hidden: false },
            { id: '7', name: 'Fatuma Said', role: 'Girls Representative', party: 'Chama cha Wasichana', image: 'https://i.pravatar.cc/150?img=30', votes: 0, hidden: false },
            { id: '8', name: 'Amina Hassan', role: 'Girls Representative', party: 'Chama cha Maendeleo', image: 'https://i.pravatar.cc/150?img=45', votes: 0, hidden: false },
            { id: '9', name: 'Zainab Ali', role: 'Girls Representative', party: 'Chama cha Wazazi', image: 'https://i.pravatar.cc/150?img=50', votes: 0, hidden: false },
            { id: '10', name: 'Maria Mushi', role: 'Girls Representative', party: 'Chama cha Vijana', image: 'https://i.pravatar.cc/150?img=55', votes: 0, hidden: false },
            { id: '11', name: 'Joseph Mwenda', role: 'Boys Representative', party: 'Chama cha Vijana', image: 'https://i.pravatar.cc/150?img=20', votes: 0, hidden: false },
            { id: '12', name: 'Emanuel Kato', role: 'Boys Representative', party: 'Chama cha Wananchi', image: 'https://i.pravatar.cc/150?img=33', votes: 0, hidden: false },
            { id: '13', name: 'Samwel Mkude', role: 'Boys Representative', party: 'Chama cha Maendeleo', image: 'https://i.pravatar.cc/150?img=40', votes: 0, hidden: false },
            { id: '14', name: 'David Mushi', role: 'Boys Representative', party: 'Chama cha Wazazi', image: 'https://i.pravatar.cc/150?img=60', votes: 0, hidden: false },
            { id: '15', name: 'Michael John', role: 'Boys Representative', party: 'Chama cha Wasichana', image: 'https://i.pravatar.cc/150?img=70', votes: 0, hidden: false },
            { id: '16', name: 'Sarah Kimani', role: 'Academic Representative', party: 'Chama cha Wanawake', image: 'https://i.pravatar.cc/150?img=80', votes: 0, hidden: false },
            { id: '17', name: 'John Otieno', role: 'Academic Representative', party: 'Chama cha Wananchi', image: 'https://i.pravatar.cc/150?img=90', votes: 0, hidden: false },
            { id: '18', name: 'Mary Wanjiru', role: 'Academic Representative', party: 'Chama cha Maendeleo', image: 'https://i.pravatar.cc/150?img=100', votes: 0, hidden: false },
            { id: '19', name: 'Peter Mwangi', role: 'Academic Representative', party: 'Chama cha Vijana', image: 'https://i.pravatar.cc/150?img=110', votes: 0, hidden: false },
            { id: '20', name: 'Jane Akinyi', role: 'Academic Representative', party: 'Chama cha Wazazi', image: 'https://i.pravatar.cc/150?img=120', votes: 0, hidden: false },
            { id: '21', name: 'James Ochieng', role: 'Sports Representative', party: 'Chama cha Vijana', image: 'https://i.pravatar.cc/150?img=130', votes: 0, hidden: false },
            { id: '22', name: 'Victor Odhiambo', role: 'Sports Representative', party: 'Chama cha Wananchi', image: 'https://i.pravatar.cc/150?img=140', votes: 0, hidden: false },
            { id: '23', name: 'Ruth Auma', role: 'Sports Representative', party: 'Chama cha Wanawake', image: 'https://i.pravatar.cc/150?img=150', votes: 0, hidden: false },
            { id: '24', name: 'Kenneth Omondi', role: 'Sports Representative', party: 'Chama cha Maendeleo', image: 'https://i.pravatar.cc/150?img=160', votes: 0, hidden: false },
            { id: '25', name: 'Brian Odhiambo', role: 'Sports Representative', party: 'Chama cha Wazazi', image: 'https://i.pravatar.cc/150?img=170', votes: 0, hidden: false }
        ],
        members: {
            M001: { name: 'Amina Hassan', pin: '1234', role: 'member', voted: false, votedFor: [] },
            M002: { name: 'Joseph Mwenda', pin: '1234', role: 'member', voted: false, votedFor: [] },
            M003: { name: 'Grace Kapinga', pin: '1234', role: 'member', voted: false, votedFor: [] },
            M004: { name: 'Peter Nkosi', pin: '1234', role: 'member', voted: false, votedFor: [] },
            M005: { name: 'Fatuma Said', pin: '1234', role: 'member', voted: false, votedFor: [] },
            M006: { name: 'Emanuel Kato', pin: '1234', role: 'member', voted: false, votedFor: [] },
            M007: { name: 'Sarah Kimani', pin: '1234', role: 'member', voted: false, votedFor: [] },
            M008: { name: 'John Otieno', pin: '1234', role: 'member', voted: false, votedFor: [] },
            M009: { name: 'Mary Wanjiru', pin: '1234', role: 'member', voted: false, votedFor: [] },
            M010: { name: 'James Ochieng', pin: '1234', role: 'member', voted: false, votedFor: [] },
            ADMIN: { name: 'Msimamizi Mkuu', pin: 'admin123', role: 'admin', voted: false, votedFor: [] }
        },
        auditLog: []
    };
    writeDB(data);
    return data;
}

// ============================================================
// API ENDPOINTS
// ============================================================
app.get('/api/sync', (req, res) => {
    const db = readDB();
    res.json(db);
});

app.get('/api/election', (req, res) => {
    const db = readDB();
    res.json(db.election);
});

app.get('/api/candidates', (req, res) => {
    const db = readDB();
    res.json(db.candidates);
});

app.get('/api/results', (req, res) => {
    const db = readDB();
    const totalVotes = db.candidates.reduce((s, c) => s + (c.votes || 0), 0);
    const totalMembers = Object.values(db.members).filter(m => m.role === 'member').length;
    const votedMembers = Object.values(db.members).filter(m => m.role === 'member' && m.voted).length;
    res.json({
        candidates: db.candidates,
        totalVotes,
        totalMembers,
        votedMembers,
        turnout: totalMembers > 0 ? Math.round(votedMembers / totalMembers * 100) : 0,
        status: db.election.status,
        settings: db.settings
    });
});

app.post('/api/login', (req, res) => {
    const { memberId, pin } = req.body;
    if (!memberId || !pin) return res.status(400).json({ error: 'ID and PIN required' });
    const db = readDB();
    const id = memberId.trim().toUpperCase();
    const member = db.members[id];
    if (!member || member.pin !== pin) return res.status(401).json({ error: 'Invalid ID or PIN' });
    res.json({
        success: true,
        member: {
            id: id,
            name: member.name,
            role: member.role,
            voted: member.voted,
            votedFor: member.votedFor || []
        }
    });
});

// ============================================================
// FIXED VOTE ENDPOINT - Allows voting per role
// ============================================================
app.post('/api/vote', (req, res) => {
    const { memberId, candidateId } = req.body;
    if (!memberId || !candidateId) return res.status(400).json({ error: 'Member ID and Candidate ID required' });
    
    const db = readDB();
    if (db.election.status !== 'open') return res.status(400).json({ error: 'Voting is closed' });
    
    const member = db.members[memberId];
    if (!member) return res.status(404).json({ error: 'Member not found' });
    
    const candidate = db.candidates.find(c => c.id === candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    
    // Check if already voted for this role
    if (member.votedFor && member.votedFor.includes(candidate.role)) {
        return res.status(400).json({ error: `Already voted for ${candidate.role}` });
    }
    
    // Track which roles they've voted for
    member.votedFor = [...(member.votedFor || []), candidate.role];
    
    // Check if they've voted for ALL roles - then mark as fully voted
    const allRoles = db.roles || [];
    const hasVotedAllRoles = allRoles.every(role => member.votedFor.includes(role));
    
    // Only mark as fully voted when they've voted for every role
    if (hasVotedAllRoles) {
        member.voted = true;
    }
    
    // Increment candidate votes
    candidate.votes = (candidate.votes || 0) + 1;
    
    db.auditLog.push({
        timestamp: new Date().toISOString(),
        action: 'VOTE_CAST',
        memberId: memberId,
        detail: `Voted for ${candidate.name} (${candidate.role})`
    });
    
    writeDB(db);
    
    res.json({
        success: true,
        message: 'Vote recorded successfully',
        member: { 
            id: memberId, 
            name: member.name, 
            role: member.role, 
            voted: member.voted,
            votedFor: member.votedFor,
            hasVotedAllRoles: hasVotedAllRoles,
            remainingRoles: allRoles.filter(r => !member.votedFor.includes(r))
        }
    });
});

// ============================================================
// FILE UPLOAD ENDPOINT
// ============================================================
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Return the URL of the uploaded file
        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
        
        console.log(`📸 File uploaded: ${req.file.filename} -> ${fileUrl}`);
        
        res.json({ 
            success: true, 
            url: fileUrl,
            imageUrl: fileUrl,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
});

// ============================================================
// ADMIN ENDPOINTS
// ============================================================
app.get('/api/admin/members', (req, res) => {
    const db = readDB();
    const members = Object.entries(db.members).filter(([id, m]) => m.role !== 'admin').map(([id, m]) => ({ id, ...m }));
    res.json(members);
});

app.post('/api/admin/members', (req, res) => {
    const { memberId, name, pin } = req.body;
    if (!memberId || !name || !pin) return res.status(400).json({ error: 'ID, name and PIN required' });
    const db = readDB();
    const id = memberId.trim().toUpperCase();
    if (db.members[id]) return res.status(400).json({ error: 'Member already exists' });
    if (pin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 characters' });
    db.members[id] = { name: name.trim(), pin: pin.trim(), role: 'member', voted: false, votedFor: [] };
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'MEMBER_ADDED', memberId: 'admin', detail: `Added ${id}: ${name}` });
    writeDB(db);
    res.json({ success: true, member: { id, name: name.trim() } });
});

app.delete('/api/admin/members/:id', (req, res) => {
    const db = readDB();
    const id = req.params.id.toUpperCase();
    if (!db.members[id]) return res.status(404).json({ error: 'Member not found' });
    if (db.members[id].role === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });
    const member = db.members[id];
    if (member.voted && member.votedFor) {
        db.candidates.forEach(c => { if (member.votedFor.includes(c.role) && c.votes > 0) c.votes--; });
    }
    delete db.members[id];
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'MEMBER_REMOVED', memberId: 'admin', detail: `Removed ${id}` });
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/admin/candidates', (req, res) => {
    const { name, role, party, image } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Name and role required' });
    const db = readDB();
    const newId = (db.candidates.length + 1).toString();
    db.candidates.push({
        id: newId,
        name: name.trim(),
        role: role.trim(),
        party: party || 'Independent',
        image: image || `https://i.pravatar.cc/150?img=${newId}`,
        votes: 0,
        hidden: false
    });
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'CANDIDATE_ADDED', memberId: 'admin', detail: `Added ${name} (${role})` });
    writeDB(db);
    res.json({ success: true, candidate: db.candidates[db.candidates.length - 1] });
});

app.delete('/api/admin/candidates/:id', (req, res) => {
    const db = readDB();
    const id = req.params.id;
    const index = db.candidates.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Candidate not found' });
    const candidate = db.candidates[index];
    db.candidates.splice(index, 1);
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'CANDIDATE_REMOVED', memberId: 'admin', detail: `Removed ${candidate.name} (${candidate.role})` });
    writeDB(db);
    res.json({ success: true });
});

app.patch('/api/admin/candidates/:id', (req, res) => {
    const db = readDB();
    const id = req.params.id;
    const candidate = db.candidates.find(c => c.id === id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    const { votes, hidden, name, role, party, image } = req.body;
    if (votes !== undefined) candidate.votes = votes;
    if (hidden !== undefined) candidate.hidden = hidden;
    if (name) candidate.name = name;
    if (role) candidate.role = role;
    if (party !== undefined) candidate.party = party;
    if (image) candidate.image = image;
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'CANDIDATE_UPDATED', memberId: 'admin', detail: `Updated ${candidate.name}` });
    writeDB(db);
    res.json({ success: true, candidate });
});

app.patch('/api/admin/election', (req, res) => {
    const { status, title, description, startDate, endDate } = req.body;
    const db = readDB();
    if (status !== undefined) db.election.status = status;
    if (title) db.election.title = title;
    if (description !== undefined) db.election.description = description;
    if (startDate !== undefined) db.election.startDate = startDate;
    if (endDate !== undefined) db.election.endDate = endDate;
    db.auditLog.push({ 
        timestamp: new Date().toISOString(), 
        action: 'ELECTION_UPDATED', 
        memberId: 'admin', 
        detail: `Updated election details` 
    });
    writeDB(db);
    res.json({ success: true, election: db.election });
});

app.patch('/api/admin/settings', (req, res) => {
    const { resultsAccess } = req.body;
    const db = readDB();
    if (resultsAccess !== undefined) db.settings.resultsAccess = resultsAccess;
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'SETTINGS_UPDATED', memberId: 'admin', detail: `Results access: ${resultsAccess}` });
    writeDB(db);
    res.json({ success: true, settings: db.settings });
});

app.post('/api/admin/reset', (req, res) => {
    const db = readDB();
    db.candidates.forEach(c => c.votes = 0);
    Object.keys(db.members).forEach(id => {
        if (db.members[id].role !== 'admin') {
            db.members[id].voted = false;
            db.members[id].votedFor = [];
        }
    });
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'VOTES_RESET', memberId: 'admin', detail: 'All votes reset' });
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/admin/delete-all-members', (req, res) => {
    const db = readDB();
    const memberIds = Object.keys(db.members).filter(id => db.members[id].role !== 'admin');
    memberIds.forEach(id => { delete db.members[id]; });
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'ALL_MEMBERS_DELETED', memberId: 'admin', detail: `Deleted ${memberIds.length} members` });
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/admin/delete-all-candidates', (req, res) => {
    const db = readDB();
    const count = db.candidates.length;
    db.candidates = [];
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'ALL_CANDIDATES_DELETED', memberId: 'admin', detail: `Deleted ${count} candidates` });
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/admin/delete-candidates-by-role', (req, res) => {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role required' });
    const db = readDB();
    const count = db.candidates.filter(c => c.role === role).length;
    db.candidates = db.candidates.filter(c => c.role !== role);
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'CANDIDATES_DELETED_BY_ROLE', memberId: 'admin', detail: `Deleted ${count} candidates with role ${role}` });
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/admin/reset-candidate-votes', (req, res) => {
    const db = readDB();
    db.candidates.forEach(c => c.votes = 0);
    Object.keys(db.members).forEach(id => {
        if (db.members[id].role !== 'admin') {
            db.members[id].voted = false;
            db.members[id].votedFor = [];
        }
    });
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'CANDIDATE_VOTES_RESET', memberId: 'admin', detail: 'All candidate votes reset to 0' });
    writeDB(db);
    res.json({ success: true });
});

app.get('/api/admin/audit', (req, res) => {
    const db = readDB();
    res.json(db.auditLog.slice(-100).reverse());
});

app.post('/api/admin/change-password', (req, res) => {
    const { memberId, currentPin, newPin } = req.body;
    if (!memberId || !currentPin || !newPin) return res.status(400).json({ error: 'All fields required' });
    const db = readDB();
    const member = db.members[memberId];
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.pin !== currentPin) return res.status(401).json({ error: 'Current PIN is incorrect' });
    if (newPin.length < 4) return res.status(400).json({ error: 'New PIN must be at least 4 characters' });
    member.pin = newPin;
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'PASSWORD_CHANGED', memberId: memberId, detail: 'Password changed' });
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/admin/change-member-password', (req, res) => {
    const { memberId, newPin } = req.body;
    if (!memberId || !newPin) return res.status(400).json({ error: 'Member ID and new PIN required' });
    const db = readDB();
    const member = db.members[memberId];
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (newPin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 characters' });
    member.pin = newPin;
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'MEMBER_PASSWORD_CHANGED', memberId: 'admin', detail: `Changed password for ${memberId}` });
    writeDB(db);
    res.json({ success: true });
});

// ============================================================
// PATCH /api/admin/roles - Manage roles (with rename support)
// ============================================================
app.patch('/api/admin/roles', (req, res) => {
    const { action, role, oldName, newName } = req.body;
    const db = readDB();
    
    if (action === 'add') {
        if (!db.roles.includes(role)) {
            db.roles.push(role);
        }
    } else if (action === 'remove') {
        db.roles = db.roles.filter(r => r !== role);
    } else if (action === 'rename') {
        const index = db.roles.indexOf(oldName);
        if (index !== -1) {
            db.roles[index] = newName;
        }
    }
    
    db.auditLog.push({ 
        timestamp: new Date().toISOString(), 
        action: 'ROLES_UPDATED', 
        memberId: 'admin', 
        detail: `${action} role: ${role || oldName} ${newName ? 'to ' + newName : ''}` 
    });
    
    writeDB(db);
    res.json({ success: true });
});

// ============================================================
// PATCH /api/admin/members/:id - Update member details
// ============================================================
app.patch('/api/admin/members/:id', (req, res) => {
    const db = readDB();
    const id = req.params.id.toUpperCase();
    const member = db.members[id];
    if (!member) return res.status(404).json({ error: 'Member not found' });
    
    const { name, voted } = req.body;
    if (name !== undefined) member.name = name;
    if (voted !== undefined) member.voted = voted;
    
    db.auditLog.push({ 
        timestamp: new Date().toISOString(), 
        action: 'MEMBER_UPDATED', 
        memberId: 'admin', 
        detail: `Updated ${id}` 
    });
    writeDB(db);
    res.json({ success: true, member });
});

// ============================================================
// PATCH /api/admin/members/:id/voted - Update member voted status
// ============================================================
app.patch('/api/admin/members/:id/voted', (req, res) => {
    const db = readDB();
    const id = req.params.id.toUpperCase();
    const member = db.members[id];
    if (!member) return res.status(404).json({ error: 'Member not found' });
    
    const { voted } = req.body;
    if (voted !== undefined) member.voted = voted;
    
    writeDB(db);
    res.json({ success: true, member });
});

// ============================================================
// START SERVER
// ============================================================
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`🗳  UCHAGUZI WA VIONGOZI - SERVER`);
    console.log(`========================================`);
    console.log(`🌐  Server running at:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://192.168.10.75:${PORT}`);
    console.log(`\n📋  Admin: ADMIN / admin123`);
    console.log(`👥  Members: M001-M010 / PIN: 1234`);
    console.log(`\n📡  SSE Events enabled for live updates`);
    console.log(`🔒  ngrok warning page removed`);
    console.log(`📸  Image upload enabled - /uploads/`);
    console.log(`========================================\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`\n❌ Port ${PORT} is already in use!`);
        console.log(`   Try killing the process using this port:`);
        console.log(`   - Windows: netstat -ano | findstr :${PORT}`);
        console.log(`   - Mac/Linux: lsof -i :${PORT}`);
    } else {
        console.error('Server error:', err);
    }
});

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});

// SSE - SERVER SENT EVENTS
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('ngrok-skip-browser-warning', 'true');

    const clientId = Date.now();
    const newClient = { id: clientId, res: res };
    clients.push(newClient);
    console.log(`✅ Client ${clientId} connected. Total clients: ${clients.length}`);

    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to live updates' })}\n\n`);

    // ONGEZA HEARTBEAT KILA SEKUNDE 15
    const heartbeatInterval = setInterval(() => {
        try {
            res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
        } catch (err) {
            clearInterval(heartbeatInterval);
        }
    }, 15000);

    req.on('close', () => {
        clearInterval(heartbeatInterval);
        clients = clients.filter(client => client.id !== clientId);
        console.log(`❌ Client ${clientId} disconnected. Total clients: ${clients.length}`);
    });
});