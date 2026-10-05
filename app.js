const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL'; // Replace with your URL
let currentUser = null;
let appData = { patients: [], outreaches: [] }; // In-memory cache for exports

// --- Initialization ---
window.onload = () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  currentUser = localStorage.getItem('twc_user') ? JSON.parse(localStorage.getItem('twc_user')) : null;
  if (currentUser) initDashboard();
};

// --- Authentication ---
async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if(!email || !password) return alert("Please enter credentials");

  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', email, password }) });
  const data = await res.json();

  if (data.status === 'success') {
    if (data.first_login) {
      document.getElementById('loginView').classList.add('hidden');
      document.getElementById('changePassView').classList.remove('hidden');
      currentUser = { email, role: data.role, name: data.name };
    } else {
      currentUser = { email, role: data.role, name: data.name };
      localStorage.setItem('twc_user', JSON.stringify(currentUser));
      initDashboard();
    }
  } else {
    alert(data.message);
  }
}

async function submitNewPassword() {
  const newPass = document.getElementById('newPassword').value;
  if(newPass.length < 6) return alert("Password must be at least 6 characters");
  
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'changePassword', email: currentUser.email, newPassword: newPass }) });
  const data = await res.json();
  
  if(data.status === 'success') {
    localStorage.setItem('twc_user', JSON.stringify(currentUser));
    document.getElementById('changePassView').classList.add('hidden');
    initDashboard();
  }
}

function logout() {
  localStorage.removeItem('twc_user');
  location.reload();
}

// --- Dashboard & Routing ---
async function initDashboard() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('changePassView').classList.add('hidden');
  document.getElementById('dashboardView').classList.remove('hidden');
  
  document.getElementById('userName').innerText = currentUser.name;
  document.getElementById('userAvatar').innerText = currentUser.name.charAt(0);
  document.getElementById('userRole').innerText = currentUser.role;

  await loadAppData(); // Fetch data for dashboards and exports
  setupSidebar();
  navigateTo('dashboard');
}

async function loadAppData() {
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDashboardData', email: currentUser.email }) });
  const data = await res.json();
  if(data.status === 'success') {
    appData.patients = data.patients || [];
    appData.outreaches = data.outreaches || [];
  }
}

function setupSidebar() {
  const nav = document.getElementById('sidebarNav');
  let links = `
    <a href="#" onclick="navigateTo('dashboard')" class="nav-link block p-3 rounded text-gray-600 font-medium">Dashboard</a>`;
  
  if (currentUser.role === 'Super-Admin') {
    links += `<a href="#" onclick="navigateTo('reports')" class="nav-link block p-3 rounded text-gray-600 font-medium">AI Executive Report</a>`;
    links += `<a href="#" onclick="navigateTo('export')" class="nav-link block p-3 rounded text-gray-600 font-medium">Data Export</a>`;
  } else if (currentUser.role === 'Coordinator') {
    links += `<a href="#" onclick="navigateTo('createOutreach')" class="nav-link block p-3 rounded text-gray-600 font-medium">Create Outreach</a>`;
    links += `<a href="#" onclick="navigateTo('invite')" class="nav-link block p-3 rounded text-gray-600 font-medium">Invite Personnel</a>`;
    links += `<a href="#" onclick="navigateTo('register')" class="nav-link block p-3 rounded text-gray-600 font-medium">Register Patient</a>`;
    links += `<a href="#" onclick="navigateTo('export')" class="nav-link block p-3 rounded text-gray-600 font-medium">Data Export</a>`;
  } else {
    links += `<a href="#" onclick="navigateTo('queue')" class="nav-link block p-3 rounded text-gray-600 font-medium">My Patient Queue</a>`;
  }
  nav.innerHTML = links;
}

function navigateTo(view) {
  const content = document.getElementById('dynamicContent');
  content.classList.remove('view');
  void content.offsetWidth; 
  content.classList.add('view');

  if (view === 'dashboard') {
    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">Welcome, ${currentUser.name}</h2>
      <div class="grid grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-lg shadow border-l-4 twc-bg border-l-8">
          <h3 class="text-gray-500 text-sm">Total Patients</h3>
          <p class="text-3xl font-bold">${appData.patients.length}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500 border-l-8">
          <h3 class="text-gray-500 text-sm">Total Outreaches</h3>
          <p class="text-3xl font-bold">${appData.outreaches.length}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 border-l-8">
          <h3 class="text-gray-500 text-sm">Your Role</h3>
          <p class="text-3xl font-bold">${currentUser.role}</p>
        </div>
      </div>`;
  } 
  else if (view === 'export') {
    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">Data Export & Reporting</h2>
      <div class="bg-white p-6 rounded-lg shadow">
        <p class="mb-4 text-gray-600">Export patient and outreach data for NDHA compliance and offline analysis.</p>
        <div class="flex space-x-4">
          <button onclick="exportData('csv')" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Export CSV</button>
          <button onclick="exportData('excel')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Export Excel</button>
          <button onclick="exportData('pdf')" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Export PDF</button>
        </div>
      </div>`;
  }
  else if (view === 'reports') {
    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">PwC-Style Executive Report</h2>
      <div class="bg-white p-6 rounded-lg shadow">
        <button onclick="generateReport()" class="twc-bg text-white px-4 py-2 rounded mb-4">Generate AI Report</button>
        <div id="reportOutput" class="bg-gray-50 p-4 rounded whitespace-pre-wrap text-sm text-gray-700"></div>
      </div>`;
  }
  else if (view === 'createOutreach') {
    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">Create Outreach Event</h2>
      <div class="bg-white p-6 rounded-lg shadow max-w-lg">
        <input type="text" id="outreachName" placeholder="Outreach Name" class="w-full p-2 mb-3 border rounded">
        <input type="date" id="outreachDate" class="w-full p-2 mb-3 border rounded">
        <input type="text" id="outreachVenue" placeholder="Venue" class="w-full p-2 mb-3 border rounded">
        <input type="text" id="outreachSite" placeholder="Site/Location" class="w-full p-2 mb-3 border rounded">
        <button onclick="createOutreach()" class="twc-bg text-white px-4 py-2 rounded">Save Outreach</button>
      </div>`;
  }
  else if (view === 'invite') {
    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">Invite Personnel</h2>
      <div class="bg-white p-6 rounded-lg shadow max-w-lg">
        <input type="text" id="pName" placeholder="Personnel Name" class="w-full p-2 mb-3 border rounded">
        <input type="email" id="pEmail" placeholder="Personnel Email" class="w-full p-2 mb-3 border rounded">
        <select id="pRole" class="w-full p-2 mb-3 border rounded">
          <option value="Nurse">Nurse</option>
          <option value="Lab-Tech">Lab Technician</option>
          <option value="Optometrist">Optometrist</option>
          <option value="Dentist">Dentist</option>
        </select>
        <button onclick="invitePersonnel()" class="twc-bg text-white px-4 py-2 rounded">Send Invite</button>
      </div>`;
  }
  else {
    content.innerHTML = `<div class="bg-white p-6 rounded shadow">View under construction.</div>`;
  }
}

// --- Action Functions ---

async function createOutreach() {
  const name = document.getElementById('outreachName').value;
  const date = document.getElementById('outreachDate').value;
  const venue = document.getElementById('outreachVenue').value;
  const site = document.getElementById('outreachSite').value;
  
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'createOutreach', name, date, venue, site, coordinator_email: currentUser.email }) });
  const data = await res.json();
  if(data.status === 'success') { alert("Outreach Created!"); await loadAppData(); navigateTo('dashboard'); }
}

async function invitePersonnel() {
  const name = document.getElementById('pName').value;
  const email = document.getElementById('pEmail').value;
  const role = document.getElementById('pRole').value;
  
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'invitePersonnel', name, email, role, site: "Global" }) });
  const data = await res.json();
  if(data.status === 'success') alert("Invite sent successfully!");
}

async function generateReport() {
  document.getElementById('reportOutput').innerText = "Generating report via Gemini AI...";
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'generateReport', email: currentUser.email }) });
  const data = await res.json();
  if(data.status === 'success') document.getElementById('reportOutput').innerText = data.report;
}

// --- Export Utilities ---
function exportData(format) {
  if (appData.patients.length === 0) return alert("No data available to export.");
  
  // Prepare clean JSON array for export
  const exportRows = appData.patients.map(p => {
    return {
      "Patient ID": p.id,
      "NHID": p.nhid,
      "Full Names": p.full_names,
      "Age": p.age,
      "Phone": p.phone,
      "Email": p.email,
      "Outreach ID": p.outreach_id
    };
  });

  if (format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadFile(csv, 'twc_outreach_data.csv', 'text/csv');
  } 
  else if (format === 'excel') {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    XLSX.writeFile(wb, 'twc_outreach_data.xlsx');
  } 
  else if (format === 'pdf') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("TWC Outreach Tracker - Patient Data Export", 14, 15);
    
    const tableColumn = ["NHID", "Full Names", "Age", "Phone", "Outreach ID"];
    const tableRows = exportRows.map(p => [p.NHID, p["Full Names"], p.Age, p.Phone, p["Outreach ID"]]);
    
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save('twc_outreach_data.pdf');
  }
}

function downloadFile(data, filename, type) {
  const file = new Blob([data], {type: type});
  const a = document.createElement("a");
  const url = URL.createObjectURL(file);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
