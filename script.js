// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, updateDoc, setDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
  apiKey: "AIzaSyBbxrAfCuLHQPZGgL2r0R3Skn8LTgl9lWQ",
  authDomain: "siddhantsenapati-968cd.firebaseapp.com",
  projectId: "siddhantsenapati-968cd",
  storageBucket: "siddhantsenapati-968cd.firebasestorage.app",
  messagingSenderId: "616072630491",
  appId: "1:616072630491:web:83ad36df83c1421fecbcfe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ---------------------------------------------------------
// 1. UI INTERACTION LOGIC (Preserved)
// ---------------------------------------------------------
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if(hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.innerHTML = navLinks.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
}

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        if(hamburger) hamburger.innerHTML = '<i class="fas fa-bars"></i>';
    });
});

const themeBtn = document.getElementById('theme-toggle');
const body = document.body;
const icon = themeBtn ? themeBtn.querySelector('i') : null;

if (localStorage.getItem('theme') === 'light') {
    body.classList.add('light-mode');
    if(icon) {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

if(themeBtn) {
    themeBtn.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        if (body.classList.contains('light-mode')) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    });
}

// ---------------------------------------------------------
// 2. AUTO-CALCULATION LOGIC
// ---------------------------------------------------------
function autoCalculateTotalExperience(earliestDateString) {
    if(!earliestDateString) return;
    const careerStart = new Date(earliestDateString); 
    const now = new Date();
    let totalMonths = (now.getFullYear() - careerStart.getFullYear()) * 12;
    totalMonths -= careerStart.getMonth();
    totalMonths += now.getMonth();
    const totalYears = (totalMonths / 12).toFixed(1);
    const totalExpElement = document.getElementById('total-exp-number');
    const heroTotalExp = document.getElementById('hero-total-exp');
    if(totalExpElement) totalExpElement.textContent = totalYears + "+";
    if(heroTotalExp) heroTotalExp.textContent = totalYears + "+";
}

function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = (endDate === 'Present' || !endDate) ? new Date() : new Date(endDate);
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += end.getMonth();
    months++; 
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    let result = "";
    if (years > 0) result += `${years} yr${years > 1 ? 's' : ''} `;
    if (remainingMonths > 0) result += `${remainingMonths} mo${remainingMonths > 1 ? 's' : ''}`;
    return result || "0 mos";
}

// ---------------------------------------------------------
// 3. FIREBASE DATA FETCHING
// ---------------------------------------------------------
async function loadPortfolio() {
    try {
        await loadExperience(); 
        await Promise.all([
            loadProfile(),
            loadProjects(),
            loadSkills(),
            loadEducation(),
            loadCertifications(),
            loadAchievements(),
            loadTraining()
        ]);
        
        initObservers();
        initTimelineInteraction();
        
        // START TRACKING
        initSilentTracker();
        
    } catch (e) {
        console.error("Error loading portfolio:", e);
    }
}

async function loadProfile() {
    const docSnap = await getDoc(doc(db, "site", "main"));
    if (docSnap.exists()) {
        const data = docSnap.data();
        setText('hero-position', data.position || 'Technical Lead');
        setText('about-text', data.aboutMe || 'Professional description...');
        setText('stat-proj', data.projCount || '10+');
        
        // SEO INJECTION
        if(data.seoTitle) document.title = data.seoTitle;
        if(data.seoDesc) document.getElementById('meta-desc').setAttribute("content", data.seoDesc);
        if(data.seoKeywords) document.getElementById('meta-keywords').setAttribute("content", data.seoKeywords);
        if(data.seoAuthor) document.getElementById('meta-author').setAttribute("content", data.seoAuthor);

        const resumeBtn = document.getElementById('hero-resume'); if(resumeBtn && data.resumeUrl) resumeBtn.href = data.resumeUrl;
        const emailLink = document.getElementById('link-email'); if(emailLink && data.socialEmail) emailLink.href = `mailto:${data.socialEmail}`;
        const liLink = document.getElementById('link-linkedin'); if(liLink && data.socialLinkedin) liLink.href = data.socialLinkedin;
        const ghLink = document.getElementById('link-github'); if(ghLink && data.socialGithub) ghLink.href = data.socialGithub;
    }
}

async function loadExperience() {
    const querySnapshot = await getDocs(collection(db, "site", "main", "experience"));
    const list = document.getElementById('experience-list');
    if(!list) return;
    let items = [];
    querySnapshot.forEach(doc => items.push(doc.data()));
    if (items.length === 0) { list.innerHTML = '<div class="text-center">No experience found.</div>'; return; }
    
    const earliestJob = items.reduce((prev, curr) => new Date(prev.start) < new Date(curr.start) ? prev : curr);
    if(earliestJob && earliestJob.start) autoCalculateTotalExperience(earliestJob.start);
    items.sort((a, b) => new Date(b.start) - new Date(a.start));

    list.innerHTML = items.map(item => {
        const duration = calculateDuration(item.start, item.end);
        const logoHtml = item.logo ? `<img src="${item.logo}" alt="${item.company}" class="company-logo">` : '';
        const descHtml = item.desc ? `<ul>${item.desc.split('\n').map(line => `<li>${line}</li>`).join('')}</ul>` : '';
        return `
            <div class="timeline-item" data-start="${item.start}" data-end="${item.end}">
                <div class="timeline-dot"></div>
                <div class="timeline-date">${item.start} - ${item.end}</div>
                <div class="timeline-content">
                    ${logoHtml}<h3>${item.role}</h3><h4>${item.company}</h4><p class="duration-text">${duration}</p>
                    <span class="click-hint"><i class="fas fa-chevron-down"></i> Click for details</span>
                    <div class="timeline-details">${descHtml}</div>
                </div>
            </div>`;
    }).join('');
}

async function loadSkills() {
    const querySnapshot = await getDocs(collection(db, "site", "main", "skills"));
    const container = document.getElementById('skills-container');
    if(!container) return;
    const skills = { 'Observability': [], 'Development': [], 'Tools': [] };
    querySnapshot.forEach(doc => {
        const data = doc.data();
        if(skills[data.category]) skills[data.category].push(data.skillName); else skills['Tools'].push(data.skillName);
    });
    const renderCard = (title, icon, list) => `<div class="skill-card"><i class="fas ${icon}"></i><h3>${title}</h3><ul>${list.map(s => `<li>${s}</li>`).join('')}</ul></div>`;
    container.innerHTML = `${renderCard('Observability', 'fa-chart-line', skills['Observability'])}${renderCard('Development', 'fa-code', skills['Development'])}${renderCard('Tools', 'fa-users-cog', skills['Tools'])}`;
}

async function loadProjects() {
    const querySnapshot = await getDocs(collection(db, "site", "main", "projects"));
    const list = document.getElementById('projects-list');
    if(!list) return;
    let html = '';
    querySnapshot.forEach(doc => {
        const item = doc.data();
        html += `<div class="project-card"><div class="project-img"><div class="img-placeholder" style="background: linear-gradient(45deg, #1e3c72, #2a5298);">${item.title}</div></div><div class="project-info"><h3>${item.title}</h3><p>${item.desc || ''}</p><div class="tags">${item.tech ? item.tech.split(',').map(t => `<span>${t.trim()}</span>`).join('') : ''}</div><a href="${item.link || '#'}" class="project-link" target="_blank">View Details <i class="fas fa-arrow-right"></i></a></div></div>`;
    });
    list.innerHTML = html;
}

async function loadEducation() {
    const querySnapshot = await getDocs(collection(db, "site", "main", "education"));
    const list = document.getElementById('education-list');
    if(!list) return;
    let html = '';
    querySnapshot.forEach(doc => { const item = doc.data(); html += `<div class="list-card"><div class="icon-box"><i class="fas fa-graduation-cap"></i></div><div class="list-content"><h3>${item.degree}</h3><h4>${item.school}</h4><p class="date">${item.year}</p></div></div>`; });
    list.innerHTML = html;
}

async function loadCertifications() {
    const querySnapshot = await getDocs(collection(db, "site", "main", "certifications"));
    const list = document.getElementById('certifications-list');
    if(!list) return;
    let html = '';
    querySnapshot.forEach(doc => { const item = doc.data(); html += `<div class="cert-card"><i class="fas fa-certificate"></i><h3>${item.certName}</h3><p>${item.issuer}</p></div>`; });
    list.innerHTML = html;
}

async function loadAchievements() {
    const querySnapshot = await getDocs(collection(db, "site", "main", "achievements"));
    const list = document.getElementById('achievements-list');
    if(!list) return;
    let html = '';
    querySnapshot.forEach(doc => { const item = doc.data(); html += `<div class="achievement-item"><i class="fas fa-trophy"></i><div><h3>${item.achieveTitle}</h3><p>${item.achieveDesc}</p></div></div>`; });
    list.innerHTML = html;
}

async function loadTraining() {
    const querySnapshot = await getDocs(collection(db, "site", "main", "training"));
    const list = document.getElementById('training-list');
    if(!list) return;
    let html = '';
    querySnapshot.forEach(doc => { const item = doc.data(); html += `<div class="list-card"><div class="icon-box"><i class="fas fa-laptop-code"></i></div><div class="list-content"><h3>${item.courseName}</h3><p>${item.institution} - ${item.year}</p></div></div>`; });
    list.innerHTML = html;
}

function setText(id, val) { const el = document.getElementById(id); if(el) el.textContent = val; }

function initObservers() {
    const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('show'); }); }, { threshold: 0.1 });
    document.querySelectorAll('.timeline-item').forEach(el => observer.observe(el));
    document.querySelectorAll('.fade-in-up').forEach(el => { el.style.opacity = '1'; el.style.animationName = 'fadeInUp'; });
}

function initTimelineInteraction() {
    document.querySelectorAll('.timeline-content').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('active');
            const hint = item.querySelector('.click-hint');
            if (item.classList.contains('active')) hint.innerHTML = '<i class="fas fa-chevron-up"></i> Close details'; else hint.innerHTML = '<i class="fas fa-chevron-down"></i> Click for details';
        });
    });
}

// Auto Set Footer Year
document.getElementById('year').textContent = new Date().getFullYear();

// ---------------------------------------------------------
// 5. SILENT TRACKER MODULE (UPDATED FOR SOURCES)
// ---------------------------------------------------------
async function initSilentTracker() {
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('visitor_id', visitorId);
    }

    let ipData = {};
    try {
        const res = await fetch('https://ipapi.co/json/');
        ipData = await res.json();
    } catch (e) { console.log('Tracker: IP fetch failed'); }

    // --- DETERMINE SOURCE ---
    const getTrafficSource = () => {
        const ref = document.referrer;
        const params = new URLSearchParams(window.location.search);
        
        // Priority 1: URL Param (e.g. ?source=whatsapp)
        if(params.get('source') || params.get('utm_source')) {
            return params.get('source') || params.get('utm_source');
        }
        
        // Priority 2: Referrer Analysis
        if(!ref) return 'Direct / Bookmark';
        if(ref.includes('google')) return 'Google Search';
        if(ref.includes('bing') || ref.includes('yahoo')) return 'Search Engine';
        if(ref.includes('linkedin')) return 'LinkedIn';
        if(ref.includes('facebook') || ref.includes('t.co') || ref.includes('twitter') || ref.includes('instagram')) return 'Social Media';
        if(ref.includes('github')) return 'GitHub';
        
        // Default
        try { return new URL(ref).hostname; } catch(e) { return 'Unknown Referral'; }
    };

    const visitData = {
        visitorId: visitorId,
        ip: ipData.ip || 'Unknown',
        city: ipData.city || 'Unknown',
        region: ipData.region || 'Unknown',
        country: ipData.country_name || 'Unknown',
        isp: ipData.org || 'Unknown',
        source: getTrafficSource(), // NEW FIELD
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        referrer: document.referrer || 'Direct',
        timestamp: serverTimestamp(),
        page: window.location.pathname
    };

    onAuthStateChanged(auth, (user) => {
        visitData.userEmail = user ? user.email : 'Guest';
        visitData.userId = user ? user.uid : 'Guest';
        addDoc(collection(db, "analytics_visits"), visitData);
    });

    // Update Counters
    const statsRef = doc(db, "analytics_stats", "global");
    setDoc(statsRef, { totalVisitors: increment(1), lastUpdated: serverTimestamp() }, { merge: true });

    document.addEventListener('click', (e) => {
        const target = e.target.closest('a, button');
        if (target) {
            const clickData = {
                visitorId: visitorId,
                tag: target.tagName,
                id: target.id || 'no-id',
                text: target.innerText.substring(0, 50),
                timestamp: serverTimestamp()
            };
            addDoc(collection(db, "analytics_clicks"), clickData);
            if (target.id === 'hero-resume') {
                updateDoc(statsRef, { resumeDownloads: increment(1) });
            }
        }
    });
}

// Start App
loadPortfolio();