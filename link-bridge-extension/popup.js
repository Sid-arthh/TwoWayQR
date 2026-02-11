// MUST BE YOUR ACTUAL RENDER URL
const SERVER_URL = "https://twowayqr.onrender.com"; 

// Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const sendInput = document.getElementById("send-input");
const btnPaste = document.getElementById("btn-paste");
const btnGenerate = document.getElementById("btn-generate");
const qrSend = document.getElementById("qrcode-send");
const qrReceive = document.getElementById("qrcode-receive");
const status = document.getElementById("status");

let socket = null;

// --- TAB NAVIGATION LOGIC ---
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 1. Deactivate all tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // 2. Activate clicked tab
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.add('active');

        // 3. Handle specific tab actions
        if (tabId === 'receive') {
            startReceiveSession();
        } else {
            stopReceiveSession(); // Close socket when leaving receive tab
        }
    });
});


// --- SEND TAB LOGIC ---
btnPaste.addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText();
        sendInput.value = text;
        sendInput.focus();
    } catch (err) {
        // This can happen if the user denies clipboard permission
        sendInput.placeholder = "Please paste manually (permission needed)";
    }
});

btnGenerate.addEventListener("click", () => {
    const url = sendInput.value.trim();
    qrSend.innerHTML = ""; // Clear previous
    if (!url) {
        sendInput.focus();
        return;
    }

    new QRCode(qrSend, {
        text: url,
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
});


// --- RECEIVE TAB LOGIC ---
function startReceiveSession() {
    if (socket && socket.readyState === WebSocket.OPEN) return; // Already connected

    const roomId = Math.random().toString(36).substring(7);
    qrReceive.innerHTML = "";
    status.innerText = "Connecting to server...";
    status.style.color = "#6c757d";

    const phonePageUrl = `${SERVER_URL}/send?room=${roomId}`;
    
    new QRCode(qrReceive, {
        text: phonePageUrl,
        width: 180,
        height: 180,
        correctLevel : QRCode.CorrectLevel.L // Lower level for faster scanning of simple URLs
    });

    const wsUrl = SERVER_URL.replace("https://", "wss://");
    socket = new WebSocket(`${wsUrl}/ws/${roomId}`);

    socket.onopen = () => {
        status.innerHTML = "Ready! <br>Scan with your phone.";
    };

    socket.onmessage = (event) => {
        const url = event.data;
        if (url && url.startsWith("http")) {
            status.innerText = "Opening URL...";
            status.style.color = "#28a745"; // Green for success
            chrome.tabs.create({ url: url });
            // Optional: Close popup after successful receive
            // window.close(); 
        }
    };

    socket.onclose = (event) => {
        if (!event.wasClean) {
             status.innerText = "Disconnected from server.";
             status.style.color = "#dc3545"; // Red for error
        }
    };
}

function stopReceiveSession() {
    if (socket) {
        socket.close();
        socket = null;
    }
    qrReceive.innerHTML = "";
    status.innerText = "Waiting for you to switch tabs...";
    status.style.color = "#6c757d";
}

// Initialize: Optionally auto-paste on open
/*
document.addEventListener('DOMContentLoaded', async () => {
     try {
        const text = await navigator.clipboard.readText();
        if (text.startsWith('http')) {
            sendInput.value = text;
        }
    } catch (err) {}
    sendInput.focus();
});
*/
