// =============================================
// CORE APPLICATION SETUP
// =============================================

// Local Storage Helper
const store = {
    load(key, fallback = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (error) {
            console.warn('Error loading from storage:', error);
            return fallback;
        }
    },
    
    save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to storage:', error);
            return false;
        }
    }
};

// Application State
const state = {
    // Event settings
    settings: store.load('ems.settings', {
        eventName: 'Tech Conference 2024',
        eventDate: new Date().toISOString().slice(0, 10),
        minTeamSize: 2,
        maxTeamSize: 5
    }),
    
    // Participants data
    participants: store.load('ems.participants', []),
    
    // User management
    users: store.load('ems.users', []),
    session: store.load('ems.session', null),
    
    // UI state
    theme: store.load('ems.theme', 'light'),
    editingId: null
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

// Generate unique IDs
function generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Simple password hashing (for demo purposes)
function hashPassword(password) {
    return btoa(unescape(encodeURIComponent(password)));
}

// Verify password
function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

// Find user by email
function findUser(email) {
    return state.users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

// Save all state to storage
function saveAll() {
    store.save('ems.settings', state.settings);
    store.save('ems.participants', state.participants);
    store.save('ems.users', state.users);
    store.save('ems.session', state.session);
    store.save('ems.theme', state.theme);
}

// =============================================
// AUTHENTICATION SYSTEM
// =============================================

function signUp() {
    // Get form values
    const name = document.getElementById('suName').value.trim();
    const email = document.getElementById('suEmail').value.trim();
    const password = document.getElementById('suPassword').value;
    const role = document.getElementById('suRole').value;

    // Validation
    if (!name || !email || !password) {
        alert('Please fill in all required fields.');
        return;
    }

    if (findUser(email)) {
        alert('An account with this email already exists.');
        return;
    }

    // Create new user
    const newUser = {
        id: generateId('user'),
        name,
        email,
        password: hashPassword(password),
        role,
        createdAt: new Date().toISOString()
    };

    state.users.push(newUser);
    state.session = { 
        id: newUser.id,
        email: newUser.email, 
        name: newUser.name, 
        role: newUser.role 
    };
    
    saveAll();
    updateUIForAuth();
    
    alert(`Welcome ${name}! Your account has been created successfully.`);
    switchTab('home');
}

function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    const user = findUser(email);
    if (!user || !verifyPassword(password, user.password)) {
        alert('Invalid email or password. Please try again.');
        return;
    }

    state.session = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
    };
    
    saveAll();
    updateUIForAuth();
    
    alert(`Welcome back, ${user.name}!`);
    switchTab('home');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        state.session = null;
        saveAll();
        updateUIForAuth();
        switchTab('home');
        alert('You have been logged out successfully.');
    }
}

function updateUIForAuth() {
    const userBadge = document.getElementById('userBadge');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const adminTab = document.getElementById('adminTab');

    if (state.session) {
        // User is logged in
        userBadge.textContent = `${state.session.name} (${state.session.role})`;
        userBadge.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        loginTab.classList.add('hidden');
        signupTab.classList.add('hidden');
        
        // Show admin tab only for admin users
        if (state.session.role === 'admin') {
            adminTab.classList.remove('hidden');
        } else {
            adminTab.classList.add('hidden');
        }
    } else {
        // User is not logged in
        userBadge.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        loginTab.classList.remove('hidden');
        signupTab.classList.remove('hidden');
        adminTab.classList.add('hidden');
    }
}

// =============================================
// PARTICIPANT MANAGEMENT
// =============================================

function onTypeChange() {
    const type = document.querySelector('input[name="regType"]:checked').value;
    document.getElementById('soloFields').classList.toggle('hidden', type !== 'solo');
    document.getElementById('teamFields').classList.toggle('hidden', type !== 'team');
    document.getElementById('teamMembers').classList.toggle('hidden', type !== 'team');
}

function addTeamMemberRow() {
    const container = document.getElementById('teamMembersList');
    const memberDiv = document.createElement('div');
    memberDiv.className = 'grid';
    memberDiv.innerHTML = `
        <div class="field">
            <label>Member Name</label>
            <input type="text" class="tm-name" placeholder="Full name" />
        </div>
        <div class="field">
            <label>Email</label>
            <input type="email" class="tm-email" placeholder="email@example.com" />
        </div>
        <div class="field">
            <label>Phone</label>
            <input type="tel" class="tm-phone" placeholder="Phone number" />
        </div>
    `;
    container.appendChild(memberDiv);
}

function setTeamSizeRows(size) {
    const container = document.getElementById('teamMembersList');
    container.innerHTML = '';
    for (let i = 0; i < size; i++) {
        addTeamMemberRow();
    }
}

function readRegistrationForm() {
    const type = document.querySelector('input[name="regType"]:checked').value;
    
    if (type === 'solo') {
        return {
            id: generateId('participant'),
            type: 'solo',
            name: document.getElementById('soloName').value.trim(),
            email: document.getElementById('soloEmail').value.trim(),
            phone: document.getElementById('soloPhone').value.trim(),
            teamName: '',
            members: [],
            present: false,
            registeredAt: new Date().toISOString()
        };
    } else {
        const teamName = document.getElementById('teamName').value.trim();
        const teamEmail = document.getElementById('teamEmail').value.trim();
        const teamPhone = document.getElementById('teamPhone').value.trim();
        
        const members = Array.from(document.querySelectorAll('#teamMembersList .grid')).map(row => ({
            name: row.querySelector('.tm-name').value.trim(),
            email: row.querySelector('.tm-email').value.trim(),
            phone: row.querySelector('.tm-phone').value.trim()
        })).filter(member => member.name); // Only include members with names

        return {
            id: generateId('team'),
            type: 'team',
            name: '',
            email: teamEmail,
            phone: teamPhone,
            teamName,
            members,
            present: false,
            registeredAt: new Date().toISOString()
        };
    }
}

function validateParticipant(participant) {
    if (participant.type === 'solo') {
        return participant.name.length > 0;
    } else {
        if (!participant.teamName) return false;
        const memberCount = participant.members.filter(m => m.name).length;
        return memberCount >= state.settings.minTeamSize && 
               memberCount <= state.settings.maxTeamSize;
    }
}

function submitRegistration(event) {
    event.preventDefault();
    
    const participant = readRegistrationForm();
    if (!validateParticipant(participant)) {
        alert('Please fill all required fields and ensure team size limits are respected.');
        return;
    }

    if (state.editingId) {
        // Update existing participant
        const index = state.participants.findIndex(p => p.id === state.editingId);
        if (index !== -1) {
            participant.id = state.editingId;
            participant.present = state.participants[index].present; // Preserve attendance status
            state.participants[index] = participant;
        }
        state.editingId = null;
        document.getElementById('saveBtn').textContent = 'Save Registration';
    } else {
        // Add new participant
        state.participants.push(participant);
    }

    saveAll();
    document.getElementById('regForm').reset();
    onTypeChange();
    setTeamSizeRows(state.settings.minTeamSize);
    
    alert(state.editingId ? 'Registration updated successfully!' : 'Registration saved successfully!');
}

// =============================================
// ATTENDANCE MANAGEMENT
// =============================================

function renderAttendance() {
    const tbody = document.getElementById('attBody');
    const searchQuery = document.getElementById('attSearch').value.toLowerCase();
    
    const filteredParticipants = state.participants.filter(participant => {
        const searchText = participant.type === 'solo' 
            ? participant.name.toLowerCase()
            : `${participant.teamName} ${participant.members.map(m => m.name).join(' ')}`.toLowerCase();
        
        return searchText.includes(searchQuery);
    });

    tbody.innerHTML = '';

    filteredParticipants.forEach(participant => {
        const row = document.createElement('tr');
        if (participant.present) {
            row.classList.add('present');
        }

        const displayName = participant.type === 'solo' 
            ? participant.name 
            : `${participant.teamName} (${participant.members.length} members)`;

        const contactInfo = participant.email || participant.phone || '-';

        row.innerHTML = `
            <td>${participant.type.toUpperCase()}</td>
            <td>${displayName}</td>
            <td>${contactInfo}</td>
            <td>${participant.present ? '✅ Present' : '❌ Absent'}</td>
            <td>
                <button class="btn ${participant.present ? 'success' : 'primary'}" 
                        data-action="toggle" data-id="${participant.id}">
                    ${participant.present ? 'Mark Absent' : 'Mark Present'}
                </button>
                <button class="btn" data-action="edit" data-id="${participant.id}">Edit</button>
                <button class="btn" data-action="qr" data-id="${participant.id}">QR</button>
                <button class="btn danger" data-action="delete" data-id="${participant.id}">Delete</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function handleAttendanceAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const participantId = button.dataset.id;
    const action = button.dataset.action;
    const participant = state.participants.find(p => p.id === participantId);

    if (!participant) return;

    switch (action) {
        case 'toggle':
            participant.present = !participant.present;
            saveAll();
            renderAttendance();
            break;
            
        case 'edit':
            startEditParticipant(participant);
            break;
            
        case 'delete':
            if (confirm('Are you sure you want to delete this participant?')) {
                state.participants = state.participants.filter(p => p.id !== participantId);
                saveAll();
                renderAttendance();
            }
            break;
            
        case 'qr':
            showQRCode(participant);
            break;
    }
}

function startEditParticipant(participant) {
    state.editingId = participant.id;
    switchTab('register');

    if (participant.type === 'solo') {
        document.querySelector('input[name="regType"][value="solo"]').checked = true;
        onTypeChange();
        document.getElementById('soloName').value = participant.name || '';
        document.getElementById('soloEmail').value = participant.email || '';
        document.getElementById('soloPhone').value = participant.phone || '';
    } else {
        document.querySelector('input[name="regType"][value="team"]').checked = true;
        onTypeChange();
        document.getElementById('teamName').value = participant.teamName || '';
        document.getElementById('teamEmail').value = participant.email || '';
        document.getElementById('teamPhone').value = participant.phone || '';
        
        const memberCount = Math.max(
            state.settings.minTeamSize,
            Math.min(state.settings.maxTeamSize, participant.members.length || state.settings.minTeamSize)
        );
        
        setTeamSizeRows(memberCount);
        
        const memberRows = document.querySelectorAll('#teamMembersList .grid');
        participant.members.forEach((member, index) => {
            if (memberRows[index]) {
                memberRows[index].querySelector('.tm-name').value = member.name || '';
                memberRows[index].querySelector('.tm-email').value = member.email || '';
                memberRows[index].querySelector('.tm-phone').value = member.phone || '';
            }
        });
    }

    document.getElementById('saveBtn').textContent = 'Update Registration';
}

// =============================================
// QR CODE SYSTEM
// =============================================

function generateQRData(participant) {
    return JSON.stringify({
        id: participant.id,
        type: participant.type,
        name: participant.type === 'solo' ? participant.name : participant.teamName,
        event: state.settings.eventName
    });
}

function showQRCode(participant) {
    const modal = document.getElementById('qrModal');
    const qrBox = document.getElementById('qrBox');
    const qrLabel = document.getElementById('qrLabel');
    
    qrBox.innerHTML = '';
    qrLabel.textContent = participant.type === 'solo' ? participant.name : participant.teamName;
    
    new QRCode(qrBox, {
        text: generateQRData(participant),
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    modal.classList.remove('hidden');
}

function closeQRModal() {
    document.getElementById('qrModal').classList.add('hidden');
}

function scanQRFromText() {
    const qrData = prompt('Paste the scanned QR code data here:');
    if (!qrData) return;

    try {
        const data = JSON.parse(qrData);
        const participant = state.participants.find(p => p.id === data.id);
        
        if (participant) {
            participant.present = true;
            saveAll();
            renderAttendance();
            alert(`✅ ${participant.type === 'solo' ? participant.name : participant.teamName} has been checked in!`);
            switchTab('attendance');
        } else {
            alert('❌ No matching participant found.');
        }
    } catch (error) {
        alert('❌ Invalid QR code data. Please try again.');
    }
}

// =============================================
// CERTIFICATE SYSTEM
// =============================================

function renderCertificatesList() {
    const container = document.getElementById('certList');
    container.innerHTML = '';

    state.participants.forEach(participant => {
        const label = participant.type === 'solo' ? participant.name : participant.teamName;
        const div = document.createElement('div');
        div.className = 'flex';
        div.innerHTML = `
            <input type="checkbox" class="cert-check" data-id="${participant.id}" />
            <span>${participant.type.toUpperCase()} - ${label}</span>
        `;
        container.appendChild(div);
    });
}

function printCertificates() {
    const selectedIds = Array.from(document.querySelectorAll('.cert-check:checked'))
        .map(checkbox => checkbox.dataset.id);
    
    if (selectedIds.length === 0) {
        alert('Please select at least one participant to generate certificates.');
        return;
    }

    const printArea = document.getElementById('printArea');
    printArea.innerHTML = '';

    selectedIds.forEach(id => {
        const participant = state.participants.find(p => p.id === id);
        if (!participant) return;

        const certificate = document.createElement('div');
        certificate.className = 'certificate';
        
        const participantName = participant.type === 'solo' ? participant.name : participant.teamName;
        const memberList = participant.type === 'team' 
            ? `<div class="text-muted mt-2">Team Members: ${participant.members.map(m => m.name).join(', ')}</div>`
            : '';

        certificate.innerHTML = `
            <div class="cert-title">Certificate of Participation</div>
            <div class="text-muted">${state.settings.eventName} • ${state.settings.eventDate}</div>
            <div class="cert-line">This certificate is awarded to</div>
            <div class="cert-name">${participantName}</div>
            ${memberList}
            <div class="mt-3">in recognition of their participation in the event.</div>
            <div class="mt-3 text-muted">Date: ${new Date().toLocaleDateString()}</div>
        `;

        printArea.appendChild(certificate);
    });

    window.print();
}

// =============================================
// SETTINGS MANAGEMENT
// =============================================

function applySettings() {
    state.settings.eventName = document.getElementById('eventName').value.trim() || 'My Event';
    state.settings.eventDate = document.getElementById('eventDate').value || new Date().toISOString().slice(0, 10);
    state.settings.minTeamSize = Math.max(1, parseInt(document.getElementById('minTeamSize').value) || 2);
    state.settings.maxTeamSize = Math.max(state.settings.minTeamSize, parseInt(document.getElementById('maxTeamSize').value) || 5);
    
    saveAll();
    renderAll();
    alert('Settings saved successfully!');
}

function fillSettingsForm() {
    document.getElementById('eventName').value = state.settings.eventName;
    document.getElementById('eventDate').value = state.settings.eventDate;
    document.getElementById('minTeamSize').value = state.settings.minTeamSize;
    document.getElementById('maxTeamSize').value = state.settings.maxTeamSize;
}

// =============================================
// DATA IMPORT/EXPORT
// =============================================

function exportToCSV() {
    const headers = ['Type', 'Name/Team', 'Email', 'Phone', 'Members', 'Present', 'Registered At'];
    
    const rows = state.participants.map(participant => [
        participant.type,
        participant.type === 'solo' ? participant.name : participant.teamName,
        participant.email || '',
        participant.phone || '',
        participant.type === 'solo' ? '' : participant.members.map(m => `${m.name} (${m.email})`).join('; '),
        participant.present ? 'Yes' : 'No',
        new Date(participant.registeredAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    downloadFile(csvContent, `${state.settings.eventName}_participants.csv`, 'text/csv');
}

function exportToJSON() {
    const exportData = {
        settings: state.settings,
        participants: state.participants,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };

    downloadFile(JSON.stringify(exportData, null, 2), `${state.settings.eventName}_backup.json`, 'application/json');
}

function importFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.settings && Array.isArray(data.participants)) {
                state.settings = data.settings;
                state.participants = data.participants;
                saveAll();
                fillSettingsForm();
                renderAll();
                alert('Data imported successfully!');
            } else {
                alert('Invalid data format. Please check your file.');
            }
        } catch (error) {
            alert('Error reading file. Please make sure it\'s a valid JSON file.');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function clearAllData() {
    if (confirm('⚠️ This will delete ALL data including participants and settings. This action cannot be undone. Are you sure?')) {
        state.participants = [];
        state.settings = {
            eventName: 'My Event',
            eventDate: new Date().toISOString().slice(0, 10),
            minTeamSize: 2,
            maxTeamSize: 5
        };
        state.editingId = null;
        saveAll();
        fillSettingsForm();
        renderAll();
        alert('All data has been cleared.');
    }
}

// =============================================
// ADMIN DASHBOARD
// =============================================

function updateAdminStats() {
    const totalParticipants = state.participants.length;
    const presentCount = state.participants.filter(p => p.present).length;
    const teamCount = state.participants.filter(p => p.type === 'team').length;
    const userCount = state.users.length;

    document.getElementById('statTotal').textContent = totalParticipants;
    document.getElementById('statPresent').textContent = presentCount;
    document.getElementById('statTeams').textContent = teamCount;
    document.getElementById('statUsers').textContent = userCount;
}

// =============================================
// THEME MANAGEMENT
// =============================================

function applyTheme() {
    document.body.classList.toggle('dark', state.theme === 'dark');
    document.getElementById('themeBtn').textContent = state.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveAll();
    applyTheme();
}

// =============================================
// NAVIGATION SYSTEM
// =============================================

function switchTab(tabId) {
    // Check admin access
    if (tabId === 'admin' && (!state.session || state.session.role !== 'admin')) {
        alert('🔒 Access denied. Administrator privileges required.');
        return;
    }

    // Update active tab buttons
    document.querySelectorAll('nav button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });

    // Show/hide tab content
    document.querySelectorAll('section.card[data-tab]').forEach(section => {
        section.classList.toggle('hidden', section.dataset.tab !== tabId);
    });

    // Special tab handling
    if (tabId === 'admin') {
        updateAdminStats();
    }
}

// =============================================
// RENDERING SYSTEM
// =============================================

function renderAll() {
    // Update header
    document.getElementById('headerTitle').textContent = state.settings.eventName;
    document.getElementById('headerDate').textContent = state.settings.eventDate;
    
    // Update team size displays
    document.getElementById('tsRange').textContent = `${state.settings.minTeamSize}-${state.settings.maxTeamSize}`;
    document.getElementById('tmRange').textContent = `${state.settings.minTeamSize}-${state.settings.maxTeamSize}`;
    
    // Render components
    renderAttendance();
    renderCertificatesList();
    
    // Update admin stats if on admin tab
    if (!document.querySelector('section.card[data-tab="admin"]').classList.contains('hidden')) {
        updateAdminStats();
    }
}

// =============================================
// APPLICATION INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Event Management System Initialized');
    
    // Initialize authentication UI
    updateUIForAuth();
    applyTheme();
    
    // Navigation setup
    document.querySelectorAll('nav button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    // Authentication events
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('goSignup').addEventListener('click', () => switchTab('signup'));
    document.getElementById('goLogin').addEventListener('click', () => switchTab('login'));
    
    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });
    
    document.getElementById('signupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        signUp();
    });
    
    document.getElementById('regForm').addEventListener('submit', submitRegistration);
    
    // Registration type toggle
    document.querySelectorAll('input[name="regType"]').forEach(radio => {
        radio.addEventListener('change', onTypeChange);
    });
    
    // Team management
    document.getElementById('setTeamMembers').addEventListener('click', function() {
        const size = parseInt(prompt(`Enter number of team members (${state.settings.minTeamSize}-${state.settings.maxTeamSize}):`, state.settings.minTeamSize));
        if (size && size >= state.settings.minTeamSize && size <= state.settings.maxTeamSize) {
            setTeamSizeRows(size);
        } else {
            alert(`Please enter a number between ${state.settings.minTeamSize} and ${state.settings.maxTeamSize}`);
        }
    });
    
    // Attendance management
    document.getElementById('attSearch').addEventListener('input', renderAttendance);
    document.getElementById('attBody').addEventListener('click', handleAttendanceAction);
    document.getElementById('exportCsv').addEventListener('click', exportToCSV);
    document.getElementById('printAtt').addEventListener('click', () => window.print());
    
    // Certificate system
    document.getElementById('printCerts').addEventListener('click', printCertificates);
    
    // QR Code system
    document.getElementById('qrClose').addEventListener('click', closeQRModal);
    document.getElementById('scanQrText').addEventListener('click', scanQRFromText);
    
    // Settings management
    document.getElementById('saveSettings').addEventListener('click', applySettings);
    document.getElementById('exportJson').addEventListener('click', exportToJSON);
    document.getElementById('importJson').addEventListener('change', importFromJSON);
    document.getElementById('clearAll').addEventListener('click', clearAllData);
    
    // Theme toggle
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    
    // Admin panel
    document.getElementById('adminGoAttendance').addEventListener('click', () => switchTab('attendance'));
    document.getElementById('adminGoSettings').addEventListener('click', () => switchTab('settings'));
    document.getElementById('adminExport').addEventListener('click', exportToJSON);
    
    // Landing page CTAs
    document.getElementById('ctaRegister').addEventListener('click', () => switchTab('register'));
    document.getElementById('ctaAttendance').addEventListener('click', () => switchTab('attendance'));
    
    // Initialize forms and render
    fillSettingsForm();
    onTypeChange();
    setTeamSizeRows(state.settings.minTeamSize);
    renderAll();
    
    console.log('✅ System ready! Participants:', state.participants.length, 'Users:', state.users.length);
});

// =============================================
// PUBLIC API (for browser console debugging)
// =============================================

window.EMS = {
    state,
    exportData: exportToJSON,
    clearData: clearAllData,
    getStats: () => ({
        participants: state.participants.length,
        present: state.participants.filter(p => p.present).length,
        teams: state.participants.filter(p => p.type === 'team').length,
        users: state.users.length
    })
};