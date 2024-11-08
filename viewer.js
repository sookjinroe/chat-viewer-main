const roleIcons = {
    'User': '👤',
    'Planner': '📋',
    'Researcher': '🔍',
    'Reviewer': '✅',
    'Assistant': '🤖',
};

let allMessages = [];

function saveToLocalStorage(file, fileContent, leftSession = 'all', rightSession = 'all') {
    localStorage.setItem('savedFileName', file.name);
    localStorage.setItem('savedContent', fileContent);
    localStorage.setItem('leftSession', leftSession);
    localStorage.setItem('rightSession', rightSession);
    updateFileNameDisplay(file.name);
}

function loadFromLocalStorage() {
    const savedContent = localStorage.getItem('savedContent');
    const savedFileName = localStorage.getItem('savedFileName');
    const savedLeftSession = localStorage.getItem('leftSession') || 'all';
    const savedRightSession = localStorage.getItem('rightSession') || 'all';

    if (savedContent && savedFileName) {
        allMessages = formatMarkdown(savedContent);
        updateSessionLists();
        updateFileNameDisplay(savedFileName);
    }
}

function updateFileNameDisplay(fileName) {
    const fileLabel = document.getElementById('currentFileName');
    if (fileName) {
        fileLabel.textContent = `Current file: ${fileName}`;
        fileLabel.classList.add('active');
    } else {
        fileLabel.textContent = 'No file loaded';
        fileLabel.classList.remove('active');
    }
}

function formatMarkdown(text) {
    if (!text) return [];
    
    const lines = text.split('\n');
    const messages = [];
    let currentMessage = null;

    for (const line of lines) {
        if (line.match(/^\d+,/)) {
            if (currentMessage) {
                messages.push(currentMessage);
            }
            const fields = parseCSVLine(line);
            const [sessionId, messageId, role, ...contentParts] = fields;
            currentMessage = {
                sessionId,
                messageId,
                role: role,
                content: [contentParts.join(',')]
            };
        } else if (currentMessage) {
            currentMessage.content.push(line);
        }
    }

    if (currentMessage) {
        messages.push(currentMessage);
    }

    return messages.map(msg => ({
        sessionId: msg.sessionId,
        messageId: msg.messageId,
        role: msg.role,
        content: msg.content.join('\n').trim()
    }));
}

function parseCSVLine(line) {
    let fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            if (inQuotes && line[i + 1] === '"') {
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (line[i] === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = '';
        } else {
            currentField += line[i];
        }
    }
    fields.push(currentField.trim());
    return fields.map(field => {
        field = field.replace(/^"|"$/g, '');
        if (field.includes('"query": "')) {
            return tryParseJSON(field);
        }
        return field;
    });
}

function tryParseJSON(text) {
    try {
        const parsed = JSON.parse(`{${text}}`);
        return Object.values(parsed)[0];
    } catch {
        return text;
    }
}

function updateSessionLists() {
    const sessions = [...new Set(allMessages.map(m => m.sessionId))];
    const selects = document.querySelectorAll('.session-select');
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="all">All Sessions</option>';
        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session;
            option.textContent = session;
            select.appendChild(option);
        });
        if (sessions.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}

function filterMessagesBySession(messages, sessionId) {
    if (sessionId === 'all') return messages;
    return messages.filter(m => m.sessionId === sessionId);
}

function getRoleClass(role) {
    return role?.toLowerCase() || 'system';
}

function displayMessagesInContainer(containerId, sessionId) {
    const container = document.getElementById(containerId);
    const filteredMessages = filterMessagesBySession(allMessages, sessionId);
    
    container.innerHTML = '';
    
    filteredMessages.forEach(message => {
        const messageDiv = document.createElement('div');
        const roleClass = getRoleClass(message.role);
        messageDiv.className = `message ${roleClass}`;

        const roleDiv = document.createElement('div');
        roleDiv.className = 'message-role';
        const roleIcon = roleIcons[message.role] || '💬';
        roleDiv.textContent = `${roleIcon} ${message.role || 'Unknown'}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = marked.parse(message.content);

        messageDiv.appendChild(roleDiv);
        messageDiv.appendChild(contentDiv);
        container.appendChild(messageDiv);
    });
}