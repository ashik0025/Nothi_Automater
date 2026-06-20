import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. SECURITY SETTINGS
// ==========================================
const MY_SECRET_PASSWORD = "admin"; 

// ==========================================
// 2. FIREBASE CLOUD DATABASE CONFIGURATION
// ==========================================
// When you upload to GitHub Pages, replace the empty strings below 
// with the config keys from your free Firebase account.
const myFirebaseConfig = {
  apiKey: "AIzaSyBFd8Ib2Vtdzt_Ens2y_l3NRqYESaL2OOc",
  authDomain: "nothi-automator.firebaseapp.com",
  projectId: "nothi-automator",
  storageBucket: "nothi-automator.firebasestorage.app",
  messagingSenderId: "1017626249806",
  appId: "1:1017626249806:web:e5d4a02ee63ae3f1ec111f",
  measurementId: "G-JPBG2JH74F"
};

// (This code handles our preview environment automatically, and falls back to yours for GitHub Pages)
let firebaseConfig;
try {
    firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : myFirebaseConfig;
} catch (e) {
    firebaseConfig = myFirebaseConfig;
}
const app_id_str = typeof __app_id !== 'undefined' ? __app_id : 'my-nothi-app-v1';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbFirestore = getFirestore(app);

// Authenticate securely before accessing cloud
const initAuth = async () => {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Authentication failed:", error);
    }
};
initAuth();

// ==========================================
// 3. APP LOGIC & STATE
// ==========================================

const defaultDB = {
    "ভ্রমণ ও প্রটোকল": [
        { 
            name: "যাতায়াত ভাতা অনুমোদন", 
            text: "বরাবর,\n[কর্মকর্তার পদবি],\nবাংলাদেশ কম্পিউটার কাউন্সিল,\nঢাকা।\n\nবিষয়: [ভ্রমণের স্থান] ভ্রমণের যাতায়াত ভাতা অনুমোদন প্রসঙ্গে।\n\nমহোদয়,\nসবিনয় নিবেদন এই যে, আমি নিম্নস্বাক্ষরকারী গত [ভ্রমণের তারিখ] তারিখে দাপ্তরিক প্রয়োজনে [ভ্রমণের স্থান] ভ্রমণ করি। উক্ত ভ্রমণের যাতায়াত বাবদ মোট [টাকার পরিমাণ] টাকা খরচ হয়েছে।\n\nঅতএব, উক্ত বিলটি অনুমোদনের জন্য বিনীত অনুরোধ করছি।\n\nনিবেদক,\n[আপনার নাম],\n[আপনার পদবি]" 
        }
    ]
};

let db = defaultDB; // In-memory database
let isEditing = false;
let editingCategory = "";
let editingIndex = -1;

// Listen for Cloud Data Changes
onAuthStateChanged(auth, (user) => {
    if (!user) return;
    
    // We store all templates in a single cloud document
    const docRef = doc(dbFirestore, 'artifacts', app_id_str, 'public', 'data', 'nothiTemplates', 'all');
    
    onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            db = snapshot.data().templates || defaultDB;
        } else {
            db = defaultDB;
            saveDB(); // Initialize cloud with default templates if empty
        }
        
        // Refresh UI if user is already logged in and using the app
        if (sessionStorage.getItem('nothi_auth_token') === 'verified') {
            if (document.getElementById('use-tab').style.display !== 'none') {
                initAppUI();
            } else {
                renderManageList();
            }
        }
    }, (error) => {
        console.error("Cloud sync error:", error);
        showToast("ক্লাউড ডাটাবেসের সাথে সংযোগ বিচ্ছিন্ন হয়েছে।");
    });
});

// Save to Cloud
async function saveDB() {
    try {
        const docRef = doc(dbFirestore, 'artifacts', app_id_str, 'public', 'data', 'nothiTemplates', 'all');
        await setDoc(docRef, { templates: db });
    } catch (error) {
        console.error("Error saving:", error);
        showToast("সংরক্ষণে সমস্যা হয়েছে!");
    }
}

// ========== AUTHENTICATION LOGIC ==========

window.onload = () => {
    if (sessionStorage.getItem('nothi_auth_token') === 'verified') {
        unlockApp();
    }
};

window.checkPassword = function() {
    const passInput = document.getElementById('passwordInput').value;
    
    if (passInput === MY_SECRET_PASSWORD) {
        sessionStorage.setItem('nothi_auth_token', 'verified');
        showToast("সফলভাবে প্রবেশ করেছেন!");
        unlockApp();
    } else {
        showToast("পাসওয়ার্ড ভুল হয়েছে! আবার চেষ্টা করুন।");
        document.getElementById('passwordInput').value = '';
    }
};

document.getElementById('passwordInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        window.checkPassword();
    }
});

function unlockApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    initAppUI();
}

window.logout = function() {
    sessionStorage.removeItem('nothi_auth_token');
    location.reload(); 
};

// ========== TAB MANAGEMENT ==========

window.switchTab = function(tab) {
    document.getElementById('use-tab').style.display = tab === 'use' ? 'block' : 'none';
    document.getElementById('manage-tab').style.display = tab === 'manage' ? 'grid' : 'none';
    
    const useBtn = document.getElementById('tab-use');
    const manageBtn = document.getElementById('tab-manage');

    if(tab === 'use') {
        useBtn.className = "flex-1 py-2 px-4 rounded-lg bg-indigo-600 text-white font-semibold transition-colors shadow-sm";
        manageBtn.className = "flex-1 py-2 px-4 rounded-lg bg-transparent text-slate-600 hover:bg-slate-100 font-semibold transition-colors";
        initAppUI();
    } else {
        manageBtn.className = "flex-1 py-2 px-4 rounded-lg bg-indigo-600 text-white font-semibold transition-colors shadow-sm";
        useBtn.className = "flex-1 py-2 px-4 rounded-lg bg-transparent text-slate-600 hover:bg-slate-100 font-semibold transition-colors";
        renderManageList();
        window.clearEditor();
    }
};

// ========== USE TAB LOGIC ==========

function initAppUI() {
    const catSelect = document.getElementById('categorySelect');
    catSelect.innerHTML = '<option value="">-- ক্যাটাগরি নির্বাচন করুন --</option>';
    Object.keys(db).forEach(cat => {
        catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    
    document.getElementById('templateSelect').innerHTML = '<option value="">-- টেমপ্লেট নির্বাচন করুন --</option>';
    document.getElementById('dynamicForm').classList.add('hidden');
    document.getElementById('outputContainer').classList.add('hidden');
}

window.loadTemplates = function() {
    const cat = document.getElementById('categorySelect').value;
    const tempSelect = document.getElementById('templateSelect');
    tempSelect.innerHTML = '<option value="">-- টেমপ্লেট নির্বাচন করুন --</option>';
    
    if (cat && db[cat]) {
        db[cat].forEach((t, index) => {
            tempSelect.innerHTML += `<option value="${index}">${t.name}</option>`;
        });
    }
    document.getElementById('dynamicForm').classList.add('hidden');
    document.getElementById('outputContainer').classList.add('hidden');
};

window.generateForm = function() {
    const cat = document.getElementById('categorySelect').value;
    const tempIdx = document.getElementById('templateSelect').value;
    const formContainer = document.getElementById('dynamicForm');
    const inputFields = document.getElementById('inputFields');
    
    if (!cat || tempIdx === "") {
        formContainer.classList.add('hidden');
        return;
    }

    const templateText = db[cat][tempIdx].text;
    const regex = /\[(.*?)\]/g;
    let match;
    const variables = new Set();

    while ((match = regex.exec(templateText)) !== null) {
        variables.add(match[1]);
    }

    if (variables.size > 0) {
        formContainer.classList.remove('hidden');
        inputFields.innerHTML = '';
        variables.forEach(v => {
            inputFields.innerHTML += `
                <div class="flex flex-col">
                    <label class="text-sm font-semibold text-slate-700 mb-1">${v}</label>
                    <input type="text" id="input_${v}" class="border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full">
                </div>
            `;
        });
    } else {
        formContainer.classList.add('hidden');
        document.getElementById('outputContainer').classList.remove('hidden');
        document.getElementById('outputText').value = templateText;
    }
};

window.generateResult = function() {
    const cat = document.getElementById('categorySelect').value;
    const tempIdx = document.getElementById('templateSelect').value;
    let text = db[cat][tempIdx].text;

    const inputs = document.querySelectorAll('[id^="input_"]');
    inputs.forEach(input => {
        const variableName = input.id.replace('input_', '');
        const value = input.value || `[${variableName}]`;
        text = text.split(`[${variableName}]`).join(value); 
    });

    document.getElementById('outputContainer').classList.remove('hidden');
    document.getElementById('outputText').value = text;
};

// ========== MANAGE TAB LOGIC ==========

function renderManageList() {
    const listDiv = document.getElementById('savedTemplatesList');
    listDiv.innerHTML = '';

    if (Object.keys(db).length === 0) {
        listDiv.innerHTML = '<p class="text-slate-500 text-sm">কোনো টেমপ্লেট নেই।</p>';
        return;
    }

    for (let cat in db) {
        let catHtml = `<div class="mb-4"><h4 class="font-bold text-slate-700 bg-slate-100 p-2 rounded">${cat}</h4><ul class="mt-2 space-y-2">`;
        
        db[cat].forEach((t, index) => {
            catHtml += `
                <li class="flex justify-between items-center p-2 border border-slate-200 rounded hover:bg-slate-50 transition">
                    <span class="text-sm font-medium text-slate-800 truncate pr-2">${t.name}</span>
                    <div class="flex gap-2 flex-shrink-0">
                        <button onclick="editTemplate('${cat}', ${index})" class="text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded text-xs font-bold">Edit</button>
                        <button onclick="deleteTemplate('${cat}', ${index})" class="text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded text-xs font-bold">Delete</button>
                    </div>
                </li>
            `;
        });
        catHtml += `</ul></div>`;
        listDiv.innerHTML += catHtml;
    }
}

window.editTemplate = function(category, index) {
    isEditing = true;
    editingCategory = category;
    editingIndex = index;
    
    const template = db[category][index];
    
    document.getElementById('editCategory').value = category;
    document.getElementById('editName').value = template.name;
    document.getElementById('editBody').value = template.text;
    
    document.getElementById('editorTitle').innerText = "টেমপ্লেট আপডেট করুন";
    const btn = document.getElementById('saveBtn');
    btn.innerText = "আপডেট করুন (Update)";
    btn.classList.replace('bg-indigo-600', 'bg-emerald-600');
    btn.classList.replace('hover:bg-indigo-700', 'hover:bg-emerald-700');
};

window.clearEditor = function() {
    isEditing = false;
    editingCategory = "";
    editingIndex = -1;
    
    document.getElementById('editCategory').value = "";
    document.getElementById('editName').value = "";
    document.getElementById('editBody').value = "";
    
    document.getElementById('editorTitle').innerText = "নতুন টেমপ্লেট যোগ করুন";
    const btn = document.getElementById('saveBtn');
    btn.innerText = "সংরক্ষণ করুন (Save)";
    btn.classList.replace('bg-emerald-600', 'bg-indigo-600');
    btn.classList.replace('hover:bg-emerald-700', 'hover:bg-indigo-700');
};

window.saveTemplate = function() {
    const cat = document.getElementById('editCategory').value.trim();
    const name = document.getElementById('editName').value.trim();
    const text = document.getElementById('editBody').value.trim();

    if (!cat || !name || !text) {
        showToast("সবগুলো ঘর পূরণ করুন!");
        return;
    }

    if (isEditing) {
        if (cat !== editingCategory) {
            db[editingCategory].splice(editingIndex, 1);
            if (db[editingCategory].length === 0) delete db[editingCategory];
            
            if (!db[cat]) db[cat] = [];
            db[cat].push({ name, text });
        } else {
            db[cat][editingIndex] = { name, text };
        }
        showToast("সফলভাবে ক্লাউডে আপডেট হয়েছে!");
    } else {
        if (!db[cat]) db[cat] = [];
        db[cat].push({ name, text });
        showToast("সফলভাবে ক্লাউডে সেভ হয়েছে!");
    }

    saveDB();
    renderManageList();
    window.clearEditor();
};

window.deleteTemplate = function(category, index) {
    if(confirm("আপনি কি নিশ্চিত যে আপনি এই টেমপ্লেটটি মুছে ফেলতে চান?")) {
        db[category].splice(index, 1);
        if (db[category].length === 0) delete db[category];
        
        saveDB();
        renderManageList();
        
        if(isEditing && editingCategory === category && editingIndex === index) {
            window.clearEditor();
        }
        showToast("টেমপ্লেট ক্লাউড থেকে মুছে ফেলা হয়েছে।");
    }
};

// ========== UTILS ==========

window.copyText = function() {
    const text = document.getElementById('outputText');
    text.select();
    document.execCommand('copy');
    showToast("টেক্সট কপি করা হয়েছে!");
};

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');
    
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 3000);
}
