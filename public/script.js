// script.js
let currentLetter = { user: '', letter: '', stamp: 'no-stamp', attachment: null };
let selectedStamp = 'no-stamp';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('writeLetterBtn').addEventListener('click', openLetterWritingPopup);
    document.getElementById('closeLetterBtn').addEventListener('click', closeLetterWritingPopup);
    document.getElementById('selectedStamp').addEventListener('click', openStampGallery);
    document.getElementById('sendLetterBtn').addEventListener('click', confirmSendLetter);
    document.getElementById('pinLetterBtn').addEventListener('click', togglePinLetter);
    document.getElementById('fileUpload').addEventListener('change', handleFileUpload);
    document.getElementById('confirmSend').addEventListener('click', sendLetter);
    document.getElementById('cancelSend').addEventListener('click', closeConfirmDialog);
    document.getElementById('closeFullscreen').addEventListener('click', closeFullscreenLetter);
    document.querySelectorAll('.stamp-options img').forEach(stamp => {
        stamp.addEventListener('click', () => selectStamp(stamp.dataset.stamp));
    });

    loadLetters();
    loadSavedLetter();
});

function openLetterWritingPopup() {
    document.getElementById('letterWritingPopup').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeLetterWritingPopup() {
    document.getElementById('letterWritingPopup').classList.add('hidden');
    document.body.style.overflow = '';
    saveLetter();
}

function openStampGallery() {
    document.getElementById('stampGallery').classList.remove('hidden');
}

function closeStampGallery() {
    document.getElementById('stampGallery').classList.add('hidden');
}

function selectStamp(stamp) {
    selectedStamp = stamp;
    document.getElementById('selectedStamp').style.backgroundImage = `url('stamps/${stamp}.png')`;
    closeStampGallery();
}

function togglePinLetter() {
    const pinnedLetter = document.getElementById('pinnedLetter');
    const letterContent = document.getElementById('letterContent');
    if (pinnedLetter.classList.contains('hidden')) {
        pinnedLetter.classList.remove('hidden');
        pinnedLetter.textContent = letterContent.textContent;
    } else {
        pinnedLetter.classList.add('hidden');
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentLetter.attachment = { type: file.type, name: file.name, data: e.target.result };
            updateAttachmentPreview();
        };
        reader.readAsDataURL(file);
    }
}

// Replace the existing updateAttachmentPreview function with this:
function updateAttachmentPreview() {
    const preview = document.getElementById('attachmentPreview');
    preview.innerHTML = '';
    if (currentLetter.attachment) {
        const attachmentInfo = document.createElement('div');
        attachmentInfo.textContent = `Attached: ${currentLetter.attachment.name}`;
        preview.appendChild(attachmentInfo);
    }
}



function confirmSendLetter() {
    document.getElementById('confirmSendDialog').classList.remove('hidden');
}

function closeConfirmDialog() {
    document.getElementById('confirmSendDialog').classList.add('hidden');
}

async function sendLetter() {
    closeConfirmDialog();
    currentLetter.user = document.getElementById('user').value;
    currentLetter.letter = document.getElementById('letterContent').textContent;
    currentLetter.stamp = selectedStamp;

    try {
        const response = await fetch('/send-letter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentLetter)
        });

        if (!response.ok) {
            throw new Error('Failed to send letter');
        }

        document.getElementById('letterContent').textContent = '';
        selectedStamp = 'no-stamp';
        document.getElementById('selectedStamp').style.backgroundImage = '';
        document.getElementById('attachmentPreview').innerHTML = '';
        currentLetter.attachment = null;
        closeLetterWritingPopup();
        localStorage.removeItem('currentLetter');
        loadLetters();
        sendPushNotification('Letter sent', 'Your letter is on its way!');
    } catch (error) {
        console.error('Error sending letter:', error);
        alert('Failed to send letter. Please try again.');
    }
}

async function loadLetters() {
    try {
        const response = await fetch('/letters');
        const letters = await response.json();
        
        const lettersContainer = document.getElementById('letters');
        lettersContainer.innerHTML = '';
        
        letters.forEach(letter => {
            const letterDiv = document.createElement('div');
            letterDiv.className = 'letter';
            const preview = letter.letter.length > 100 ? letter.letter.substring(0, 100) + '...' : letter.letter;
            letterDiv.innerHTML = `
                <h3>${letter.user}</h3>
                <p>${preview}</p>
                <small>${new Date(letter.date).toLocaleString()}</small>
                ${letter.stamp !== 'no-stamp' ? `<img src="stamps/${letter.stamp}.png" class="stamp" alt="Stamp">` : ''}
                ${letter.attachment ? '<span class="attachment-icon">📎</span>' : ''}
            `;
            
            if (new Date() - new Date(letter.date) < 600000) { // 10 minutes in milliseconds
                const countdown = document.createElement('div');
                countdown.className = 'countdown';
                letterDiv.appendChild(countdown);
                
                const updateCountdown = () => {
                    const timeLeft = 600000 - (new Date() - new Date(letter.date));
                    if (timeLeft > 0) {
                        const minutes = Math.floor(timeLeft / 60000);
                        const seconds = Math.floor((timeLeft % 60000) / 1000);
                        countdown.textContent = `Arriving in ${minutes}m ${seconds}s`;
                        setTimeout(updateCountdown, 1000);
                    } else {
                        countdown.textContent = 'Letter has arrived!';
                        letterDiv.classList.add('arrived');
                        sendPushNotification('Letter arrived', `A letter from ${letter.user} has arrived!`);
                    }
                };
                updateCountdown();
            } else {
                letterDiv.classList.add('arrived');
            }

            letterDiv.addEventListener('click', () => {
                if (letterDiv.classList.contains('arrived')) {
                    showFullscreenLetter(letter);
                }
            });

            lettersContainer.appendChild(letterDiv);
        });
    } catch (error) {
        console.error('Error loading letters:', error);
        alert('Failed to load letters. Please refresh the page.');
    }
}

function showFullscreenLetter(letter) {
    const fullscreenLetter = document.getElementById('fullscreenLetter');
    const fullscreenLetterContent = document.getElementById('fullscreenLetterContent');
    fullscreenLetterContent.innerHTML = `
        <h3>${letter.user}</h3>
        <p>${letter.letter}</p>
        <small>${new Date(letter.date).toLocaleString()}</small>
        ${letter.stamp !== 'no-stamp' ? `<img src="stamps/${letter.stamp}.png" class="stamp" alt="Stamp">` : ''}
    `;

    if (letter.attachment) {
        const attachmentDiv = document.createElement('div');
        attachmentDiv.className = 'letter-attachment';
        if (letter.attachment.type.startsWith('image/')) {
            attachmentDiv.innerHTML = `<img src="${letter.attachment.data}" alt="Attached Image">`;
        } else if (letter.attachment.type.startsWith('video/')) {
            attachmentDiv.innerHTML = `<video src="${letter.attachment.data}" controls></video>`;
        } else if (letter.attachment.type.startsWith('audio/')) {
            attachmentDiv.innerHTML = `<audio src="${letter.attachment.data}" controls></audio>`;
        } else {
            attachmentDiv.innerHTML = `<p>Attachment: ${letter.attachment.type}</p>`;
        }
        fullscreenLetterContent.appendChild(attachmentDiv);
    }

    fullscreenLetter.classList.remove('hidden');
}

function closeFullscreenLetter() {
    document.getElementById('fullscreenLetter').classList.add('hidden');
}

function sendPushNotification(title, body) {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body });
            }
        });
    }
}

function loadSavedLetter() {
    const savedLetter = localStorage.getItem('currentLetter');
    if (savedLetter) {
        currentLetter = JSON.parse(savedLetter);
        document.getElementById('user').value = currentLetter.user;
        document.getElementById('letterContent').textContent = currentLetter.letter;
        selectedStamp = currentLetter.stamp;
        document.getElementById('selectedStamp').style.backgroundImage = `url('stamps/${selectedStamp}.png')`;
        if (currentLetter.attachment) {
            updateAttachmentPreview();
        }
    }
}

function saveLetter() {
    currentLetter.user = document.getElementById('user').value;
    currentLetter.letter = document.getElementById('letterContent').textContent;
    currentLetter.stamp = selectedStamp;
    localStorage.setItem('currentLetter', JSON.stringify(currentLetter));
}

// Auto-save the letter every 30 seconds
setInterval(saveLetter, 30000);

// Update word count as user types
document.getElementById('letterContent').addEventListener('input', function() {
    const wordCount = this.textContent.trim().split(/\s+/).filter(Boolean).length;
    document.getElementById('wordCount').textContent = `${wordCount} words`;
});

// Request notification permission when the page loads
if ('Notification' in window) {
    Notification.requestPermission();
}