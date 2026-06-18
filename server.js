const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// ============================================================
// CACHE CONTROL & NGROK WARNING REMOVAL
// ============================================================
app.use((req, res, next) => {
    // Cache control
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // NGROK - Ondoa warning page
    res.setHeader('ngrok-skip-browser-warning', 'true');
    
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

const DB_FILE = path.join(__dirname, 'db.json');
let clients = []; // SSE clients

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
    const newClient = {
        id: clientId,
        res: res
    };
    clients.push(newClient);
    console.log(`✅ Client ${clientId} connected. Total clients: ${clients.length}`);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to live updates' })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
        console.log(`❌ Client ${clientId} disconnected. Total clients: ${clients.length}`);
    });
});

// Broadcast update to all clients
function broadcastUpdate(data) {
    const message = `data: ${JSON.stringify({ type: 'update', timestamp: Date.now(), ...data })}\n\n`;
    clients.forEach(client => {
        try {
            client.res.write(message);
        } catch (err) {
            console.error('Error broadcasting to client:', err);
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
    // Broadcast update to all connected clients
    broadcastUpdate({
        action: 'data_updated',
        timestamp: new Date().toISOString()
    });
}

function initDB() {
    const data = {
        election: { title: 'Uchaguzi wa Viwango Mbalimbali 2026', status: 'open' },
        settings: { resultsAccess: false },
        roles: ['Head of Hostels', 'Girls Representative', 'Boys Representative', 'Academic Representative', 'Sports Representative'],
        candidates: [
            { id: '1', name: 'Baraka Msigwa', role: 'Head of Hostels', party: 'Chama cha Maendeleo',
                image: 'https://i.pravatar.cc/150?img=1', votes: 0, hidden: false },
            { id: '2', name: 'Rehema Lyimo', role: 'Head of Hostels', party: 'Chama cha Wanawake',
                image: 'https://i.pravatar.cc/150?img=5', votes: 0, hidden: false },
            { id: '3', name: 'Daniel Chuma', role: 'Head of Hostels', party: 'Chama cha Vijana',
                image: 'https://i.pravatar.cc/150?img=3', votes: 0, hidden: false },
            { id: '4', name: 'Salma Juma', role: 'Head of Hostels', party: 'Chama cha Wazazi',
                image: 'https://i.pravatar.cc/150?img=10', votes: 0, hidden: false },
            { id: '5', name: 'Peter Nkosi', role: 'Head of Hostels', party: 'Chama cha Wananchi',
                image: 'https://i.pravatar.cc/150?img=12', votes: 0, hidden: false },
            { id: '6', name: 'Grace Kapinga', role: 'Girls Representative', party: 'Chama cha Wanawake',
                image: 'https://i.pravatar.cc/150?img=25', votes: 0, hidden: false },
            { id: '7', name: 'Fatuma Said', role: 'Girls Representative', party: 'Chama cha Wasichana',
                image: 'https://i.pravatar.cc/150?img=30', votes: 0, hidden: false },
            { id: '8', name: 'Amina Hassan', role: 'Girls Representative', party: 'Chama cha Maendeleo',
                image: 'https://i.pravatar.cc/150?img=45', votes: 0, hidden: false },
            { id: '9', name: 'Zainab Ali', role: 'Girls Representative', party: 'Chama cha Wazazi',
                image: 'https://i.pravatar.cc/150?img=50', votes: 0, hidden: false },
            { id: '10', name: 'Maria Mushi', role: 'Girls Representative', party: 'Chama cha Vijana',
                image: 'https://i.pravatar.cc/150?img=55', votes: 0, hidden: false },
            { id: '11', name: 'Joseph Mwenda', role: 'Boys Representative', party: 'Chama cha Vijana',
                image: 'https://i.pravatar.cc/150?img=20', votes: 0, hidden: false },
            { id: '12', name: 'Emanuel Kato', role: 'Boys Representative', party: 'Chama cha Wananchi',
                image: 'https://i.pravatar.cc/150?img=33', votes: 0, hidden: false },
            { id: '13', name: 'Samwel Mkude', role: 'Boys Representative', party: 'Chama cha Maendeleo',
                image: 'https://i.pravatar.cc/150?img=40', votes: 0, hidden: false },
            { id: '14', name: 'David Mushi', role: 'Boys Representative', party: 'Chama cha Wazazi',
                image: 'https://i.pravatar.cc/150?img=60', votes: 0, hidden: false },
            { id: '15', name: 'Michael John', role: 'Boys Representative', party: 'Chama cha Wasichana',
                image: 'https://i.pravatar.cc/150?img=70', votes: 0, hidden: false },
            { id: '16', name: 'Sarah Kimani', role: 'Academic Representative', party: 'Chama cha Wanawake',
                image: 'https://i.pravatar.cc/150?img=80', votes: 0, hidden: false },
            { id: '17', name: 'John Otieno', role: 'Academic Representative', party: 'Chama cha Wananchi',
                image: 'https://i.pravatar.cc/150?img=90', votes: 0, hidden: false },
            { id: '18', name: 'Mary Wanjiru', role: 'Academic Representative', party: 'Chama cha Maendeleo',
                image: 'https://i.pravatar.cc/150?img=100', votes: 0, hidden: false },
            { id: '19', name: 'Peter Mwangi', role: 'Academic Representative', party: 'Chama cha Vijana',
                image: 'https://i.pravatar.cc/150?img=110', votes: 0, hidden: false },
            { id: '20', name: 'Jane Akinyi', role: 'Academic Representative', party: 'Chama cha Wazazi',
                image: 'https://i.pravatar.cc/150?img=120', votes: 0, hidden: false },
            { id: '21', name: 'James Ochieng', role: 'Sports Representative', party: 'Chama cha Vijana',
                image: 'https://i.pravatar.cc/150?img=130', votes: 0, hidden: false },
            { id: '22', name: 'Victor Odhiambo', role: 'Sports Representative', party: 'Chama cha Wananchi',
                image: 'https://i.pravatar.cc/150?img=140', votes: 0, hidden: false },
            { id: '23', name: 'Ruth Auma', role: 'Sports Representative', party: 'Chama cha Wanawake',
                image: 'https://i.pravatar.cc/150?img=150', votes: 0, hidden: false },
            { id: '24', name: 'Kenneth Omondi', role: 'Sports Representative', party: 'Chama cha Maendeleo',
                image: 'https://i.pravatar.cc/150?img=160', votes: 0, hidden: false },
            { id: '25', name: 'Brian Odhiambo', role: 'Sports Representative', party: 'Chama cha Wazazi',
                image: 'https://i.pravatar.cc/150?img=170', votes: 0, hidden: false }
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

app.post('/api/vote', (req, res) => {
    const { memberId, candidateId } = req.body;
    if (!memberId || !candidateId) return res.status(400).json({ error: 'Member ID and Candidate ID required' });
    const db = readDB();
    if (db.election.status !== 'open') return res.status(400).json({ error: 'Voting is closed' });
    const member = db.members[memberId];
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.voted) return res.status(400).json({ error: 'Already voted' });
    const candidate = db.candidates.find(c => c.id === candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    if (member.votedFor && member.votedFor.includes(candidate.role)) {
        return res.status(400).json({ error: `Already voted for ${candidate.role}` });
    }
    member.voted = true;
    member.votedFor = [...(member.votedFor || []), candidate.role];
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
        member: { id: memberId, name: member.name, role: member.role, voted: true, votedFor: member.votedFor }
    });
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
    const { status, title } = req.body;
    const db = readDB();
    if (status) db.election.status = status;
    if (title) db.election.title = title;
    db.auditLog.push({ timestamp: new Date().toISOString(), action: 'ELECTION_UPDATED', memberId: 'admin', detail: `Status: ${status}, Title: ${title}` });
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