const express = require('express');
const cors = require('cors');
const path = require('path');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- STATE ---
let systemStatus = 'Monitoring...'; 
let currentVitals = { hr: '--', spo2: '--', temp: '--', motion: 'Resting' };
let sosState = { isActive: false, reason: '', countdown: 10, dispatched: false };
let isOffline = false;

// --- SERIAL CONNECTION ---
// Change this to your actual COM port (e.g., 'COM3' or '/dev/ttyUSB0')
const COM_PORT = 'COM3'; 

try {
    const port = new SerialPort({ path: COM_PORT, baudRate: 115200 });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    console.log(`Listening to ESP32 on ${COM_PORT}...`);

    parser.on('data', (line) => {
        console.log(`[ESP32] ${line}`);

        // Parse Live Telemetry: "TELEMETRY: HR=72"
        if (line.includes('TELEMETRY: HR=')) {
            const match = line.match(/HR=(\d+)/);
            if (match) {
                currentVitals.hr = match[1];
            }
        }

        // Parse Alert Starts
        if (line.includes('ALERT BUFFER STARTED:')) {
            sosState.isActive = true;
            sosState.reason = line.replace('ALERT BUFFER STARTED:', '').trim();
            sosState.countdown = 10;
            sosState.dispatched = false;
        }

        // Parse Alert Cancelled
        if (line.includes('ALERT CANCELLED BY USER')) {
            sosState.isActive = false;
        }

        // Parse Alert Dispatch
        if (line.includes('Sending Alert..') || line.includes('Sending SMS')) {
            sosState.dispatched = true;
        }

        // Parse Standby return
        if (line.includes('STANDBY OVER - BACK TO NORMAL')) {
            sosState.isActive = false;
            sosState.dispatched = false;
        }

        // Parse Health Scan results
        // Example: "Scan Result -> HR: 85 (valid=1) SpO2: 98 (valid=1)"
        if (line.includes('Scan Result ->')) {
            const hrMatch = line.match(/HR:\s*(\d+)/);
            const spo2Match = line.match(/SpO2:\s*(\d+)/);
            if (hrMatch) currentVitals.hr = hrMatch[1];
            if (spo2Match) currentVitals.spo2 = spo2Match[1];
        }
    });

    port.on('error', (err) => {
        console.error(`Serial Port Error: ${err.message}. (Is the ESP32 plugged in? Is the COM port correct?)`);
    });

} catch (err) {
    console.error('Failed to initialize SerialPort. Please check your COM port.', err);
}


// --- API ---
app.get('/api/dashboard-data', (req, res) => {
    // If SOS is active but not dispatched, decrement countdown purely for UI
    if (sosState.isActive && !sosState.dispatched) {
        if (sosState.countdown > 0) sosState.countdown--;
    }
    
    res.json({
        vitals: currentVitals,
        systemStatus: systemStatus,
        isPaused: false,
        sosState: sosState,
        sleepScore: 82
    });
});

app.listen(PORT, () => {
    console.log(`Sehchar Backend Server running on http://localhost:${PORT}`);
});
