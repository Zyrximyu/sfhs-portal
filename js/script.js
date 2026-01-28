// Google Sheets Configuration
const SHEET_ID = '1-bxFwdvaZdvFzldkBf04dzytLTwOZYtTnaXz6jdcnYE';
const API_KEY = 'AIzaSyALwDV5-QJgNJYUQ-Uz9vnDUjolucgM7GY'; // You'll need to add your own API key
const RANGE = 'Sheet1!A:D'; // Adjust based on your sheet structure (User, Email, Password, Role)

function showForm(formId) {
    document.querySelectorAll(".form-box").forEach(form => form.classList.remove("active"));
    document.getElementById(formId).classList.add("active");
}

// Fetch data from Google Sheets
async function fetchSheetData() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.values) {
            return data.values;
        }
        return [];
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return [];
    }
}

// Verify login credentials against Google Sheet
async function verifyLogin(user, email, password) {
    const sheetData = await fetchSheetData();
    
    // Skip header row if it exists
    const startRow = (sheetData[0] && sheetData[0][0].toLowerCase() === 'user') ? 1 : 0;
    
    for (let i = startRow; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (row[0] && row[1] && row[2]) {
            // Compare user, email, and password
            if (row[0].trim() === user && row[1].trim() === email && row[2] === password) {
                return {
                    success: true,
                    role: row[3] || 'user', // Role is in column D
                    user: row[0]
                };
            }
        }
    }
    
    return { success: false };
}

// Login form verification
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const id = document.getElementById('id').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Verifying...';
        submitBtn.disabled = true;

        try {
            const result = await verifyLogin(id, email, password);
            
            if (result.success) {
                // Determine redirect based on role
                const role = result.role.toLowerCase();
                if (role.includes('admin')) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'user.html';
                }
            } else {
                alert('Invalid User ID, Email, or Password. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login. Please try again.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}
