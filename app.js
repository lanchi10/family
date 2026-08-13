/**
 * OT Visualizer 7 Dashboard - Interactive Logic (RTL / Hebrew)
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSimulator();
  initIEPMatrix();
  initActivityPlanner();
  initPrintHandlers();
});

/* -------------------------------------------------------------------------- */
/* 1. Navigation & Tab Switching                                              */
/* -------------------------------------------------------------------------- */
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.dashboard-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetSec = document.getElementById(targetId);

      if (targetSec) {
        window.scrollTo({
          top: targetSec.offsetTop - 70,
          behavior: 'smooth'
        });
      }

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Intersection Observer for active tab on scroll
  const observerOptions = {
    root: null,
    rootMargin: '-80px 0px -50% 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(sec => observer.observe(sec));
}

/* -------------------------------------------------------------------------- */
/* 2. Interactive Clinical Simulator                                          */
/* -------------------------------------------------------------------------- */
let synth = window.speechSynthesis;
let utterance = null;
let wordElements = [];
let isSpeaking = false;

function initSimulator() {
  const modeBtns = document.querySelectorAll('.mode-btn');
  const simScreen = document.getElementById('simScreen');
  const simContent = document.getElementById('simContent');
  const currentModeTitle = document.getElementById('currentModeTitle');
  const contrastFilter = document.getElementById('contrastFilter');
  const ledSlider = document.getElementById('ledSlider');
  const ledOverlay = document.getElementById('ledOverlay');
  const zoomSlider = document.getElementById('zoomSlider');
  const zoomVal = document.getElementById('zoomVal');
  const toggleLineGuide = document.getElementById('toggleLineGuide');
  const simLineGuide = document.getElementById('simLineGuide');
  const motorGraphic = document.getElementById('motorGraphic');
  const readingParagraph = document.getElementById('readingParagraph');
  const otTipText = document.getElementById('otTipText');

  // Speech Elements
  const speakBtn = document.getElementById('speakBtn');
  const stopSpeakBtn = document.getElementById('stopSpeakBtn');
  const ttsRate = document.getElementById('ttsRate');
  const rateVal = document.getElementById('rateVal');

  wordElements = Array.from(document.querySelectorAll('.reading-sample .word'));

  // Modes definitions & tips
  const modesData = {
    reading: {
      title: 'מצב 1: מיקוד קשבי והקראה (TTS)',
      tip: 'במצב קריאה, תוכנת Readiris DYS מקריאה את המילים תוך הדגשה צהובה. סרגל המיקוד החזותי מונע הסחת דעת משורות סמוכות.',
      showGraphic: false,
      showGuide: true
    },
    motorskills: {
      title: 'מצב 2: תכנון תנועה ומוטוריקה עדינה',
      tip: 'במצב תכנון תנועה, המסך מתפצל: בצד אחד דגם מוקפא (מבוך/צורות) ובצד השני היד של הילד פועלת בזמן אמת מתחת למצלמה.',
      showGraphic: true,
      showGuide: false
    },
    sensory: {
      title: 'מצב 3: ויסות תחושתי ותאורה מבוקרת',
      tip: 'לילדים עם רגישות חזותית או פחד ממגע בנייר, ניתן להקרין את הנייר על מסך מחשב ברקע ירוק מרגיע או בצהוב על שחור.',
      showGraphic: false,
      showGuide: true
    },
    broad: {
      title: 'מצב 4: משטחי A3 וסמלי תקשורת',
      tip: 'המצלמה נפתחת לזווית רחבה (A3). ניתן להניח משחקי קופסה, לוחות תקשורת PECS או קלפי טיפול מוגדלים.',
      showGraphic: false,
      showGuide: false
    }
  };

  // Switch Modes
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const modeKey = btn.getAttribute('data-mode');
      const data = modesData[modeKey];

      currentModeTitle.textContent = data.title;
      otTipText.textContent = data.tip;

      if (data.showGraphic) {
        motorGraphic.style.display = 'block';
        readingParagraph.style.display = 'none';
      } else {
        motorGraphic.style.display = 'none';
        readingParagraph.style.display = 'block';
      }

      toggleLineGuide.checked = data.showGuide;
      simLineGuide.style.display = data.showGuide ? 'block' : 'none';
    });
  });

  // Contrast Filter Change
  contrastFilter.addEventListener('change', (e) => {
    const val = e.target.value;
    simContent.className = `sim-document-text ${val}`;
  });

  // LED Light Slider
  ledSlider.addEventListener('input', (e) => {
    const level = e.target.value;
    ledOverlay.className = `led-overlay led-level-${level}`;
  });

  // Zoom Slider
  zoomSlider.addEventListener('input', (e) => {
    const scale = e.target.value;
    zoomVal.textContent = `${scale}%`;
    simContent.style.transform = `scale(${scale / 100})`;
  });

  // Line Guide Toggle
  toggleLineGuide.addEventListener('change', (e) => {
    simLineGuide.style.display = e.target.checked ? 'block' : 'none';
  });

  // TTS Rate Slider
  ttsRate.addEventListener('input', (e) => {
    rateVal.textContent = `${e.target.value}x`;
  });

  // Text-To-Speech (Web Speech API with Fallback simulation)
  speakBtn.addEventListener('click', () => {
    const sampleText = "כאשר הילד מניח את דף העבודה תחת מצלמת ה-IRIScan, המצלמה מגדילה את הסמלים ומאפשרת לו להתמקד במשימה ללא הצפה חזותית.";

    if ('speechSynthesis' in window) {
      synth.cancel(); // Reset active speech

      utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.lang = 'he-IL';
      utterance.rate = parseFloat(ttsRate.value);

      // Try finding Hebrew Voice if available
      const voices = synth.getVoices();
      const heVoice = voices.find(v => v.lang.includes('he'));
      if (heVoice) utterance.voice = heVoice;

      let wordIndex = 0;

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          clearHighlights();
          if (wordElements[wordIndex]) {
            wordElements[wordIndex].classList.add('highlight');
            // Move line guide to highlighted word position
            const wordOffsetTop = wordElements[wordIndex].offsetTop;
            simLineGuide.style.top = `${Math.max(10, wordOffsetTop - 5)}px`;
            wordIndex++;
          }
        }
      };

      utterance.onstart = () => {
        isSpeaking = true;
        speakBtn.disabled = true;
        stopSpeakBtn.disabled = false;
      };

      utterance.onend = () => {
        resetTTSState();
      };

      utterance.onerror = () => {
        // Fallback simulation if browser Hebrew synth voice is absent/fails
        simulateSpeechHighlight();
      };

      synth.speak(utterance);

      // If speech synthesis boundary events don't fire reliably in browser, run fallback highlight loop
      setTimeout(() => {
        if (isSpeaking && wordIndex === 0) {
          simulateSpeechHighlight();
        }
      }, 500);

    } else {
      simulateSpeechHighlight();
    }
  });

  stopSpeakBtn.addEventListener('click', () => {
    if ('speechSynthesis' in window) {
      synth.cancel();
    }
    resetTTSState();
  });

  function simulateSpeechHighlight() {
    isSpeaking = true;
    speakBtn.disabled = true;
    stopSpeakBtn.disabled = false;
    let idx = 0;
    const intervalTime = (1000 / parseFloat(ttsRate.value)) * 0.45;

    const interval = setInterval(() => {
      if (!isSpeaking || idx >= wordElements.length) {
        clearInterval(interval);
        resetTTSState();
        return;
      }
      clearHighlights();
      if (wordElements[idx]) {
        wordElements[idx].classList.add('highlight');
        simLineGuide.style.top = `${Math.max(10, wordElements[idx].offsetTop - 5)}px`;
      }
      idx++;
    }, intervalTime);
  }

  function clearHighlights() {
    wordElements.forEach(el => el.classList.remove('highlight'));
  }

  function resetTTSState() {
    isSpeaking = false;
    speakBtn.disabled = false;
    stopSpeakBtn.disabled = true;
    clearHighlights();
    simLineGuide.style.top = '35%';
  }
}

/* -------------------------------------------------------------------------- */
/* 3. Clinical IEP Matrix Filter                                              */
/* -------------------------------------------------------------------------- */
function initIEPMatrix() {
  const chips = document.querySelectorAll('.filter-chip');
  const rows = document.querySelectorAll('#matrixTable tbody tr');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const filter = chip.getAttribute('data-filter');

      rows.forEach(row => {
        if (filter === 'all' || row.getAttribute('data-category') === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 4. OT Activity Generator (Plan Generator)                                  */
/* -------------------------------------------------------------------------- */
function initActivityPlanner() {
  const generatePlanBtn = document.getElementById('generatePlanBtn');
  const planResultContainer = document.getElementById('planResultContainer');
  const planContent = document.getElementById('planContent');

  generatePlanBtn.addEventListener('click', () => {
    const age = document.getElementById('childAge').value;
    const challenge = document.getElementById('primaryChallenge').value;
    const asd = document.getElementById('asdLevel').value;

    const planData = buildPlan(age, challenge, asd);
    planContent.innerHTML = planData;
    planResultContainer.style.display = 'block';
    planResultContainer.scrollIntoView({ behavior: 'smooth' });
  });

  const printPlanBtn = document.getElementById('printPlanBtn');
  if (printPlanBtn) {
    printPlanBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

function buildPlan(age, challenge, asd) {
  let title = "מערך טיפולי מומלץ (45 דק') לריפוי בעיסוק";
  
  const step1 = `
    <div class="plan-step">
      <div class="plan-step-title">⏱️ 0-10 דקות: חימום וויסות תחושתי חזותי</div>
      <div class="plan-step-desc">הנחת משטח תחושתי או קלפי משחק גדולים תחת המצלמה במשטח A3. הפעלת תאורת LED ניטרלית ברמה 1 למניעת סינוור. המטרה: יצירת תחושת ביטחון ושליטה בסביבה.</div>
    </div>
  `;

  let step2 = '';
  if (challenge === 'sensory') {
    step2 = `
      <div class="plan-step">
        <div class="plan-step-title">⏱️ 10-25 דקות: התנסות מונגשת תחת המצלמה (הפחתת הימנעות ממגע)</div>
        <div class="plan-step-desc">שימוש בפילטר "צהוב על שחור" או "ירוק מרגיע". הילד מבצע משימות כתיבה/ציור על גבי טאבלט או מסך מחשב המשקף את דף העבודה מהמצלמה בלייב, ללא מגע ישיר בנייר שמחולל הימנעות.</div>
      </div>
    `;
  } else if (challenge === 'graphomotor') {
    step2 = `
      <div class="plan-step">
        <div class="plan-step-title">⏱️ 10-25 דקות: תרגילי תכנון תנועה ומשחק מראה (Split Screen)</div>
        <div class="plan-step-desc">הפעלת מצב מסך מפוצל. בצד אחד מוצג תצלום מוקפא של דגם מבוך/צורות, ובצד השני הילד עובד מתחת למצלמה. המטפלת מנטרת את אחיזת העיפרון ואת כיוון התנועה בלייב בדיוק 4K.</div>
      </div>
    `;
  } else if (challenge === 'executive') {
    step2 = `
      <div class="plan-step">
        <div class="plan-step-title">⏱️ 10-25 דקות: פירוק משימה מורכבת והסתרת מסיחים (Chunking)</div>
        <div class="plan-step-desc">הגדרת זום גבוה במצלמה (150%) בשילוב סרגל המיקוד החזותי הדיגיטלי. הילד נחשף בכל עת רק לסעיף אחד מתוך דף העבודה, תוך מניעת תסכול והצפה מגירויים היקפיים.</div>
      </div>
    `;
  } else {
    step2 = `
      <div class="plan-step">
        <div class="plan-step-title">⏱️ 10-25 דקות: הנגשת קריאה והוראות באמצעות Readiris DYS</div>
        <div class="plan-step-desc">סריקת הטקסט מתוך הספר/דף העבודה, הפעלת הקראה קולית בקצב איטי (0.8x) והדגשת מילים בעברית. הילד מאזין ומשלים את המילים המבוקשות באופן עצמאי.</div>
      </div>
    `;
  }

  const step3 = `
    <div class="plan-step">
      <div class="plan-step-title">⏱️ 25-38 דקות: תרכול גרפו-מוטורי ויצירה עצמאית</div>
      <div class="plan-step-desc">הילד יוצר צורות או כותב על משטח העבודה, המצלמה מקליטה סרטון קצר (Video Recording) של התהליך. הילד צופה בעצמו בסיום המשימה ומקבל משוב חזותי מעצים.</div>
    </div>
  `;

  const step4 = `
    <div class="plan-step">
      <div class="plan-step-title">⏱️ 38-45 דקות: סיכום טיפול והדרכת הורים/צוות</div>
      <div class="plan-step-desc">שמירת תמונות התוצר והפקת PDF מונגש בלחיצה אחת בתוכנה. הצגת התקדם הילד להורים בשיתוף המסך, תוך מתן דגשים למשימות בית.</div>
    </div>
  `;

  return `
    <h4>${title}</h4>
    <div style="font-size: 0.85rem; color: #15803D; margin-bottom: 1rem;">
      <strong>פרופיל נבחר:</strong> גיל ${getAgeText(age)} | אתגר מרכזי: ${getChallengeText(challenge)} | תפקוד: ${getASDText(asd)}
    </div>
    ${step1}
    ${step2}
    ${step3}
    ${step4}
  `;
}

function getAgeText(age) {
  if (age === 'preschool') return '3-6 (גיל הרך)';
  if (age === 'elementary') return '7-11 (יסודי)';
  return '12-18 (חטיבה/תיכון)';
}

function getChallengeText(ch) {
  if (ch === 'sensory') return 'ויסות חזותי והימנעות';
  if (ch === 'graphomotor') return 'תכנון תנועה ומוטוריקה';
  if (ch === 'executive') return 'תפקודים ניהוליים וקשב';
  return 'הנגשת קריאה וטקסטים';
}

function getASDText(asd) {
  if (asd === 'high') return 'תפקוד גבוה';
  if (asd === 'medium') return 'תפקוד בינוני';
  return 'תקשורת תומכת (תמ"ח)';
}

/* -------------------------------------------------------------------------- */
/* 5. Print Handler                                                           */
/* -------------------------------------------------------------------------- */
function initPrintHandlers() {
  const quickPrintBtn = document.getElementById('quickPrintBtn');
  if (quickPrintBtn) {
    quickPrintBtn.addEventListener('click', () => {
      window.print();
    });
  }
}
