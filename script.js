(function () {
    // ==================== АВТОРИЗАЦИЯ ====================
    var authScreen = document.getElementById('auth-screen');
    var appScreen = document.getElementById('app');
    var btnLogin = document.getElementById('btn-login');
    var authEmail = document.getElementById('auth-email');
    var authPassword = document.getElementById('auth-password');
    var authError = document.getElementById('auth-error');

    function showAuthError(msg) {
        if(authError) authError.textContent = msg;
    }

    window.initAuth = function() {
        window.firebaseModules.onAuthStateChanged(window.firebaseAuth, async (user) => {
            if (user) {
                console.log("Пользователь вошел:", user.email);
                authScreen.classList.add('hidden');
                appScreen.classList.remove('hidden');
                
                try {
                    var docRef = window.firebaseModules.doc(window.firebaseDB, "users", user.uid);
                    var docSnap = await window.firebaseModules.getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        var cloudData = docSnap.data();
                        if(cloudData.tasks) localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData.tasks));
                        if(cloudData.classes) localStorage.setItem(CLASS_KEY, JSON.stringify(cloudData.classes));
                        if(cloudData.notes) localStorage.setItem(NOTES_KEY, JSON.stringify(cloudData.notes));
                        if(cloudData.hp !== undefined) localStorage.setItem(HP_KEY, cloudData.hp.toString());
                        if(cloudData.dt !== undefined) localStorage.setItem(DT_KEY, cloudData.dt.toString());
                        if(cloudData.style !== undefined) localStorage.setItem(STYLE_KEY, cloudData.style.toString());
                        if(cloudData.reward) localStorage.setItem(REWARD_KEY, cloudData.reward);
                        console.log("Данные успешно загружены из облака!");
                    } else {
                        console.log("Облако пустое. Это первый вход.");
                    }
                    
                    loadHP(); loadDT(); loadStyle(); renderTasks(); renderCalendar();
                    checkDTReward();
                    
                } catch (error) {
                    console.error("Ошибка загрузки из облака:", error);
                }
            } else {
                authScreen.classList.remove('hidden');
                appScreen.classList.add('hidden');
            }
        });
    };

    if (btnLogin) {
        btnLogin.addEventListener('click', function() {
            showAuthError('');
            var email = authEmail.value.trim();
            var password = authPassword.value;
            if (!email || !password) { showAuthError('Введите email и пароль'); return; }

            window.firebaseModules.signInWithEmailAndPassword(window.firebaseAuth, email, password)
                .catch((error) => {
                    showAuthError('Ошибка входа. Проверьте почту и пароль.');
                });
        });
    }

    // ==================== ЦИТАТЫ ПЕРСОНАЖЕЙ ====================
    var quotes = {
        Dante: {
            praise: ["Heh, not bad!", "That's the spirit!", "You're getting the hang of this!", "Keep it up, partner!", "Now THAT'S what I call style!", "Jackpot! Now that's what I call a job well done.", "You're on a roll! Let's rock, baby! Keep it up.", "Score one for Dante! I'm winning, in case you've forgotten. And so are you.", "Not bad. You might just be worth the trouble after all."],
            scold: ["You call that a deadline?", "Lazy... real lazy.", "C'mon, don't make me come over there.", "You had one job!", "Even a demon could do better!", "'Not gonna die,' my ass. You dropped the ball on this one.", "What a BIG surprise. You failed. Try again.", "Cash up front? This, I like. But this result? Not so much.", "You call that motivated? I've seen naps with more energy."]
        },
        Vergil: {
            praise: ["Acceptable.", "Your power grows...", "This is the way of the demon slayer.", "A worthy effort.", "Power... you are beginning to understand it.", "You've acquired more power. Adequate. Now maintain your motivation.", "This is... acceptable. Do not let it be a fluke.", "Might controls everything. Today, you proved you have some.", "Good. Now you are one step closer to being worthy."],
            scold: ["Humbug.", "You lack focus.", "This is pathetic. Get it together.", "I expected more from you.", "Yamato does not tolerate weakness.", "Foolishness. Might controls everything, and you clearly lacked it.", "Where's your motivation? This failure is pathetic.", "You are not worthy of this power. A child of Sparda would do better.", "Without strength, you cannot protect anything. Not even your own progress."]
        },
        Nero: {
            praise: ["Yeah! That's what I'm talking about!", "Nice work!", "You're really stepping it up!", "Boom! Got it done!", "That's awesome, old timer!", "I'm baggin' this! Now that's what I'm talking about!", "Hell yeah! I'm not letting you die! And you didn't let this task die either. Good job.", "From that day forth... you've gotten stronger. Keep it up.", "You proved 'em wrong. Just like I knew you would."],
            scold: ["No way... you missed it?!", "Come on, don't mess this up!", "I can't believe you...", "You gotta be kidding me!", "My devil arm is judging you right now.", "What the hell's your problem?! You're better than this!", "That bastard called you dead weight, and right now you're proving him right. Get it together!", "I couldn't protect... my focus. And neither did you. Snap out of it!", "You're gonna let a little setback stop you?"]
        }
    };

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function showToast(character, type) {
        var charQuotes = quotes[character];
        if (!charQuotes || !charQuotes[type]) return;

        var message = randomChoice(charQuotes[type]);
        var container = document.getElementById('toast-container');
        if (!container) return;

        var toast = document.createElement('div');
        toast.className = 'toast ' + character.toLowerCase() + ' ' + type;
        
        var imgSrc = '';
        if (character === 'Dante') imgSrc = 'image/Dante.png';
        if (character === 'Vergil') imgSrc = 'image/Vergil.png';
        if (character === 'Nero') imgSrc = 'image/Nero.png';

        toast.innerHTML = '<span class="toast-icon"><img src="' + imgSrc + '" alt="' + character + '"></span> <span class="toast-text">' + message + '</span>';
        container.appendChild(toast);

        setTimeout(function() {
            toast.classList.add('fade-out');
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 500);
        }, 4000);
    }

    // ==================== DOM ЭЛЕМЕНТЫ ====================
    var taskForm = document.getElementById('task-form');
    var taskTitleInput = document.getElementById('task-title');
    var taskDateInput = document.getElementById('task-date');
    var taskStartInput = document.getElementById('task-start');
    var taskEndInput = document.getElementById('task-end');
    var taskSeveritySelect = document.getElementById('task-severity');
    var hpBar = document.getElementById('hp-bar');
    var hpValue = document.getElementById('hp-value');
    var dtBar = document.getElementById('dt-bar');
    var dtValue = document.getElementById('dt-value');
    var styleRank = document.getElementById('style-rank');
    var stylePercent = document.getElementById('style-percent');

    // ==================== КЛЮЧИ И СОСТОЯНИЕ ====================
    var STORAGE_KEY = 'dmc_tasks';
    var CLASS_KEY = 'dmc_classes';
    var HP_KEY = 'dmc_hp';
    var DT_KEY = 'dmc_dt';
    var CHECKED_KEY = 'dmc_checked';
    var NOTES_KEY = 'dmc_notes';
    var STYLE_KEY = 'dmc_style';
    var REWARD_KEY = 'dmc_reward_text';
    var REWARD_CLAIM_KEY = 'dmc_reward_claimed_week';

    var hp = 100;
    var dt = 0;
    var styleScore = 0;
    var HP_LOSS = { '1': 10, '2': 15, '3': 20 };
    var DT_GAIN = { '1': 10, '2': 15, '3': 20 };

    function syncToCloud() {
        var user = window.firebaseAuth.currentUser;
        if (!user) return;

        var dataToSync = {
            tasks: JSON.parse(localStorage.getItem(STORAGE_KEY)) || [],
            classes: JSON.parse(localStorage.getItem(CLASS_KEY)) || [],
            notes: JSON.parse(localStorage.getItem(NOTES_KEY)) || {},
            hp: parseInt(localStorage.getItem(HP_KEY)) || 100,
            dt: parseInt(localStorage.getItem(DT_KEY)) || 0,
            style: parseInt(localStorage.getItem(STYLE_KEY)) || 0,
            reward: localStorage.getItem(REWARD_KEY) || ""
        };

        var docRef = window.firebaseModules.doc(window.firebaseDB, "users", user.uid);
        window.firebaseModules.setDoc(docRef, dataToSync)
            .then(() => console.log("Синхронизировано с облаком!"))
            .catch((e) => console.error("Ошибка синхронизации:", e));
    }

    // ==================== ФУНКЦИИ ХРАНЕНИЯ И МИГРАЦИИ ====================
    function loadTasks() { 
        try { 
            var tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            // МИГРАЦИЯ: переводим старые задачи (с deadline) на новый формат (date + start/end)
            return tasks.map(function(t) {
                if (t.deadline && !t.date) {
                    var d = new Date(t.deadline);
                    t.date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                    t.endTime = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
                    t.startTime = '';
                    delete t.deadline;
                }
                return t;
            });
        } catch(e) { return []; } 
    }
    function saveTasks(tasks) { 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); 
        syncToCloud();
    }
    
    function loadClasses() { try { return JSON.parse(localStorage.getItem(CLASS_KEY)) || []; } catch(e) { return []; } }
    function saveClasses(classes) { localStorage.setItem(CLASS_KEY, JSON.stringify(classes)); syncToCloud(); }

    function loadHP() {
        try { var s = localStorage.getItem(HP_KEY); if (s !== null) { hp = parseInt(s, 10); if (isNaN(hp)) hp = 100; } } catch(e) { hp = 100; }
        updateHPBar();
    }
    function saveHP() {
        if (hp < 0) hp = 0; if (hp > 100) hp = 100;
        localStorage.setItem(HP_KEY, hp.toString());
        updateHPBar(); syncToCloud();
    }
    
    function loadDT() {
        try { var s = localStorage.getItem(DT_KEY); if (s !== null) { dt = parseInt(s, 10); if (isNaN(dt)) dt = 0; } } catch(e) { dt = 0; }
        updateDTBar();
    }
    function saveDT() {
        if (dt < 0) dt = 0; if (dt > 100) dt = 100;
        localStorage.setItem(DT_KEY, dt.toString());
        updateDTBar(); syncToCloud(); checkDTReward(); 
    }
    
    function loadStyle() {
        try { var s = localStorage.getItem(STYLE_KEY); if (s !== null) { styleScore = parseInt(s, 10); if (isNaN(styleScore)) styleScore = 0; } } catch(e) { styleScore = 0; }
        updateStyleMeter();
    }
    function saveStyle() {
        if (styleScore < 0) styleScore = 0;
        localStorage.setItem(STYLE_KEY, styleScore.toString());
        updateStyleMeter(); syncToCloud();
    }

    // ==================== ОБНОВЛЕНИЕ UI ====================
    function createHPSegments() {
        if(!hpBar) return; hpBar.innerHTML = '';
        for (var i = 0; i < 10; i++) { var seg = document.createElement('div'); seg.className = 'hp-segment'; hpBar.appendChild(seg); }
    }
    function createDTSegments() {
        if(!dtBar) return; dtBar.innerHTML = '';
        for (var i = 0; i < 10; i++) { var seg = document.createElement('div'); seg.className = 'dt-segment'; if (i < 4) seg.classList.add('long'); dtBar.appendChild(seg); }
    }

    function updateHPBar() {
        if(!hpValue || !hpBar) return; hpValue.textContent = hp + '%';
        var segments = hpBar.querySelectorAll('.hp-segment');
        var activeCount = Math.round((hp / 100) * 10);
        for (var i = 0; i < segments.length; i++) {
            if (i < activeCount) { segments[i].classList.add('active'); segments[i].classList.remove('empty'); }
            else { segments[i].classList.remove('active'); segments[i].classList.add('empty'); }
        }
        if (hp <= 30) hpBar.classList.add('low'); else hpBar.classList.remove('low');
        if (hp <= 0) { var deathScreen = document.getElementById('death-screen'); if(deathScreen) deathScreen.classList.remove('hidden'); }
    }

    function updateDTBar() {
        if(!dtValue || !dtBar) return; dtValue.textContent = dt + '%';
        var segments = dtBar.querySelectorAll('.dt-segment');
        var activeCount = Math.round((dt / 100) * 10);
        for (var i = 0; i < segments.length; i++) {
            if (i < activeCount) { segments[i].classList.add('active'); segments[i].classList.remove('empty'); }
            else { segments[i].classList.remove('active'); segments[i].classList.add('empty'); }
        }
        if (dt >= 70) dtBar.classList.add('critical'); else dtBar.classList.remove('critical');
    }

    function updateStyleMeter() {
        if(!styleRank || !stylePercent) return;
        if (styleScore < 0) styleScore = 0; 
        stylePercent.textContent = styleScore + '%';
        var rank = 'D', rankClass = '';
        if (styleScore >= 120) { rank = 'SSS'; rankClass = 'rank-sss'; }
        else if (styleScore >= 90) { rank = 'SS'; rankClass = 'rank-ss'; }
        else if (styleScore >= 60) { rank = 'S'; rankClass = 'rank-s'; }
        else if (styleScore >= 40) { rank = 'A'; }
        else if (styleScore >= 20) { rank = 'B'; }
        else if (styleScore >= 5) { rank = 'C'; }
        styleRank.textContent = rank; styleRank.className = 'style-rank ' + rankClass;
    }

    // ==================== ХЕЛПЕРЫ ====================
    function formatDate(dateString) {
        var d = new Date(dateString);
        return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    function escapeHtml(text) {
        var div = document.createElement('div'); div.appendChild(document.createTextNode(text)); return div.innerHTML;
    }

    // ==================== РЕНДЕР И ПРОВЕРКА ПРОСРОЧКИ ====================
    function renderTasks() {
        if (typeof renderCalendar === "function") renderCalendar();
    }

    function checkOverdueTasks() {
        var tasks = loadTasks();
        var now = new Date().getTime();
        var checkedKeys = JSON.parse(localStorage.getItem(CHECKED_KEY)) || {};
        var hpLost = 0;
        var dtMissed = false;

        for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
            if (task.completed) continue;
            
            // Собираем время дедлайна из даты и времени конца
            var endDateTime = new Date(task.date + 'T' + task.endTime).getTime();
            if(isNaN(endDateTime)) continue;

            var checkKey = task.id + '_' + task.date;
            if (now > endDateTime && !checkedKeys[checkKey]) {
                checkedKeys[checkKey] = true;
                dtMissed = true;
                hpLost += (HP_LOSS[task.severity] || 15);
            }
        }

        if (hpLost > 0) {
            hp -= hpLost; saveHP();
            var styleLost = Math.floor(hpLost / 2);
            if (styleLost < 5) styleLost = 5; 
            styleScore -= styleLost;
            if (styleScore < 0) styleScore = 0;
            
            saveStyle(); showToast("Vergil", "scold");
        }
        if (dtMissed) saveDT();
        localStorage.setItem(CHECKED_KEY, JSON.stringify(checkedKeys));
        renderTasks();
    }

    // ==================== ДЕЙСТВИЯ С ЗАДАЧАМИ ====================
    function addTask(title, date, startTime, endTime, severity) {
        var tasks = loadTasks();
        tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), title: title, date: date, startTime: startTime, endTime: endTime, severity: severity, completed: false, createdAt: new Date().toISOString() });
        saveTasks(tasks); renderTasks(); checkOverdueTasks();
    }

    function deleteTask(id) {
        var tasks = loadTasks();
        var filtered = []; var deletedTask = null;
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].id !== id) filtered.push(tasks[i]);
            else deletedTask = tasks[i]; 
        }
        saveTasks(filtered); renderTasks();
        if (deletedTask && !deletedTask.completed) showToast("Vergil", "scold"); 
    }

    function completeTask(id) {
        var tasks = loadTasks();
        var foundTask = null;
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].id === id) { tasks[i].completed = true; foundTask = tasks[i]; break; }
        }
        if (!foundTask) return;
        saveTasks(tasks);

        var now = new Date().getTime();
        var endDateTime = new Date(foundTask.date + 'T' + foundTask.endTime).getTime();
        var isOverdue = now > endDateTime;
        var severity = foundTask.severity;

        if (!isOverdue) {
            dt += (DT_GAIN[severity] || 15);
            var styleGain = (severity === '1') ? 5 : (severity === '3') ? 20 : 10;
            styleScore += styleGain;
            saveDT(); saveStyle(); showToast("Dante","praise");
        } else {
            showToast("Nero","praise");
        }
        saveHP(); renderTasks();
    }

    // ==================== ЛОГИКА НАГРАДЫ ЗА ДТ ====================
    function checkDTReward() {
        if (dt < 100) return; 
        var today = new Date();
        var firstJan = new Date(today.getFullYear(), 0, 1);
        var days = Math.floor((today - firstJan) / (24 * 60 * 60 * 1000));
        var currentWeek = today.getFullYear() + '-' + Math.ceil((today.getDay() + 1 + days) / 7);
        var lastClaimed = localStorage.getItem(REWARD_CLAIM_KEY);

        // ВРЕМЕННО УБРАЛИ ПРОВЕРКУ НА ВЫХОДНЫЕ
        if (lastClaimed !== currentWeek) {
            var savedReward = localStorage.getItem(REWARD_KEY) || '';
            var rewardInput = document.getElementById('dt-reward-input');
            if(rewardInput) rewardInput.value = savedReward;
            var modal = document.getElementById('dt-reward-modal');
            if(modal) { modal.classList.remove('hidden'); setTimeout(function() { modal.classList.add('show'); }, 50); }
        }
    }

    var rewardIcon = document.getElementById('dt-reward-icon');
    if(rewardIcon) {
        rewardIcon.addEventListener('click', function() {
            var currentReward = localStorage.getItem(REWARD_KEY) || '';
            var newReward = prompt("Ваша награда за полный Devil Trigger:", currentReward);
            if (newReward !== null) { localStorage.setItem(REWARD_KEY, newReward); syncToCloud(); showToast("Dante", "praise"); }
        });
    }

    var saveRewardBtn = document.getElementById('dt-save-btn');
    if(saveRewardBtn) {
        saveRewardBtn.addEventListener('click', function() {
            var text = document.getElementById('dt-reward-input').value;
            localStorage.setItem(REWARD_KEY, text); syncToCloud(); showToast("Dante", "praise"); 
        });
    }

    var claimRewardBtn = document.getElementById('dt-claim-btn');
    if(claimRewardBtn) {
        claimRewardBtn.addEventListener('click', function() {
            var today = new Date();
            var firstJan = new Date(today.getFullYear(), 0, 1);
            var days = Math.floor((today - firstJan) / (24 * 60 * 60 * 1000));
            var currentWeek = today.getFullYear() + '-' + Math.ceil((today.getDay() + 1 + days) / 7);
            localStorage.setItem(REWARD_CLAIM_KEY, currentWeek);
            dt = 0; saveDT(); 
            var modal = document.getElementById('dt-reward-modal');
            modal.classList.remove('show'); setTimeout(function() { modal.classList.add('hidden'); }, 500);
        });
    }

    // ==================== СОБЫТИЯ ФОРМ ====================
    if (taskForm) {
        taskForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var title = taskTitleInput.value.trim();
            var date = taskDateInput.value;
            var startTime = taskStartInput.value;
            var endTime = taskEndInput.value;
            var severity = taskSeveritySelect.value;
            
            if (!title || !date || !endTime) { alert('Пожалуйста, укажите название, дату и время конца!'); return; }
            
            addTask(title, date, startTime, endTime, severity);
            showToast("Dante", "praise"); 
            
            taskTitleInput.value = ''; taskDateInput.value = ''; taskStartInput.value = ''; taskEndInput.value = ''; taskSeveritySelect.value = '2';
        });
    }

    // ==================== СБРОС И ВОЗРОЖДЕНИЕ ====================
    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm("Сбросить HP до 100% и DT до 0%? Задачи останутся на месте.")) {
                localStorage.removeItem(HP_KEY); localStorage.removeItem(DT_KEY); localStorage.removeItem(CHECKED_KEY); localStorage.removeItem(STYLE_KEY); 
                hp = 100; dt = 0; styleScore = 0;
                saveHP(); saveDT(); updateStyleMeter(); renderTasks(); showToast("Dante", "praise");
            }
        });
    }

    window.revivePlayer = function(trialName) {
        hp = 100; saveHP();
        document.getElementById('death-screen').classList.add('hidden');
        var today = new Date(); today.setHours(23, 59, 0, 0);
        var tzOffset = today.getTimezoneOffset() * 60000;
        var localISOTime = (new Date(today - tzOffset)).toISOString().slice(0, 16);
        // Для возрождения ставим время дедлайна на 23:59
        var todayStr = new Date().toISOString().split('T')[0];
        addTask(trialName, todayStr, '', '23:59', '3');
        showToast("Vergil", "praise");
    };

    // ==================== КАЛЕНДАРЬ ====================
    var currentDate = new Date(); 
    var calendarView = 'month';
    var isArchiveView = false; 

    function renderCalendar() {
        var grid = document.getElementById('calendar-grid');
        var monthLabel = document.getElementById('current-month');
        if (!grid || !monthLabel) return;

        grid.innerHTML = ''; 
        var tasks = loadTasks();
        var classes = loadClasses();
        
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var monthNames = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];
        
        var currentYear = currentDate.getFullYear();
        var currentMonth = currentDate.getMonth();
        var startDate, endDate;

        if (calendarView === 'week') {
            startDate = new Date(currentDate); startDate.setHours(0, 0, 0, 0);
            var dayOfWeek = startDate.getDay() || 7;
            startDate.setDate(startDate.getDate() - (dayOfWeek - 1));
            endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6);
            monthLabel.textContent = monthNames[startDate.getMonth()] + ' ' + startDate.getFullYear();
        } else {
            startDate = new Date(currentYear, currentMonth, 1);
            var firstDay = startDate.getDay() || 7; 
            startDate.setDate(1 - (firstDay - 1)); 
            endDate = new Date(currentYear, currentMonth + 1, 0); 
            var lastDay = endDate.getDay() || 7;
            endDate.setDate(endDate.getDate() + (7 - lastDay)); 
            monthLabel.textContent = monthNames[currentMonth] + ' ' + currentYear;
        }

        var daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
        daysOfWeek.forEach(function(d) {
            var el = document.createElement('div'); el.className = 'calendar-day-header'; el.textContent = d; grid.appendChild(el);
        });

        var loopDate = new Date(startDate);
        while (loopDate <= endDate) {
            var dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.innerHTML = '<span>' + loopDate.getDate() + '</span>';

            if (loopDate.getTime() === today.getTime()) dayEl.classList.add('today');
            if (calendarView === 'month' && loopDate.getMonth() !== currentMonth) dayEl.classList.add('other-month');

            var hasTask = false, hasOverdue = false, hasClass = false, hasArchive = false;
            var dateStr = loopDate.getFullYear() + '-' + String(loopDate.getMonth() + 1).padStart(2, '0') + '-' + String(loopDate.getDate()).padStart(2, '0');

            tasks.forEach(function(task) {
                if (task.date === dateStr) {
                    if (task.completed) {
                        hasArchive = true;
                    } else {
                        hasTask = true;
                        // Сравниваем время конца, чтобы понять, просрочено ли
                        var endDateTime = new Date(task.date + 'T' + task.endTime).getTime();
                        if (endDateTime < today.getTime()) hasOverdue = true;
                    }
                }
            });

            classes.forEach(function(cls) { if (cls.date === dateStr) hasClass = true; });

            if (isArchiveView) {
                if (hasArchive) dayEl.classList.add('has-archive');
            } else {
                if (hasTask) dayEl.classList.add('has-task');
                if (hasOverdue) dayEl.classList.add('overdue-day');
            }
            if (hasClass) dayEl.classList.add('has-class');

            if (hasTask || hasClass || hasArchive) {
                dayEl.addEventListener('click', (function(dStr, dObj) {
                    return function() { showDayDetails(dStr, dObj); };
                })(dateStr, new Date(loopDate)));
            }

            grid.appendChild(dayEl);
            loopDate.setDate(loopDate.getDate() + 1);
        }
    }

    // ==================== ОКНО ДНЯ ====================
    function showDayDetails(dateStr, dateObj) {
        var modal = document.getElementById('day-modal');
        var title = document.getElementById('modal-date-title');
        var list = document.getElementById('modal-list');
        
        var dayNames = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
        var monthNames = ["ЯНВАРЯ", "ФЕВРАЛЯ", "МАРТА", "АПРЕЛЯ", "МАЯ", "ИЮНЯ", "ИЮЛЯ", "АВГУСТА", "СЕНТЯБРЯ", "ОКТЯБРЯ", "НОЯБРЯ", "ДЕКАБРЯ"];
        
        title.textContent = dayNames[dateObj.getDay()] + ', ' + dateObj.getDate() + ' ' + monthNames[dateObj.getMonth()];
        title.setAttribute('data-date', dateStr); 
        list.innerHTML = '';

        var notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};
        var noteInput = document.getElementById('day-note-input');
        if(noteInput) noteInput.value = notes[dateStr] || '';

        var tasks = loadTasks();
        var classes = loadClasses();

        classes.filter(c => c.date === dateStr).sort((a,b) => a.startTime.localeCompare(b.startTime)).forEach(function(cls) {
            var div = document.createElement('div');
            div.className = 'modal-item blue';
            var innerHTML = '<strong>' + cls.startTime + ' - ' + cls.endTime + '</strong><br>' + cls.title + ' (' + cls.type + ', ' + cls.room + ')';
            innerHTML += '<div style="margin-top: 8px; display: flex; gap: 5px; flex-wrap: wrap;">' +
                         '<button class="btn-complete" onclick="window.editClass(\'' + cls.id + '\', \'' + dateStr + '\')">ИЗМЕНИТЬ</button>' +
                         '<button style="background:#c0a060; color:#000; border:none; border-radius:3px; padding:5px 10px; cursor:pointer;" onclick="window.moveClass(\'' + cls.id + '\', \'' + dateStr + '\')">ПЕРЕДВИНУТЬ</button>' +
                         '<button class="btn-delete" onclick="window.deleteClass(\'' + cls.id + '\', \'' + dateStr + '\')">УДАЛИТЬ</button>' +
                         '</div>';
            div.innerHTML = innerHTML; list.appendChild(div);
        });

        tasks.forEach(function(task) {
            if (task.date === dateStr) {
                if (isArchiveView && !task.completed) return;
                if (!isArchiveView && task.completed) return;

                var div = document.createElement('div');
                div.className = 'modal-item red';
                
                // Отображение времени: если есть старт, показываем диапазон
                var timeStr = task.startTime ? (task.startTime + ' - ' + task.endTime) : ('До ' + task.endTime);
                
                var innerHTML = '<strong>' + timeStr + '</strong> - ' + task.title + (task.completed ? ' (Done)' : '');
                
                if (!task.completed) {
                    innerHTML += '<div style="margin-top: 8px; display: flex; gap: 5px;">' +
                                 '<button class="btn-complete" onclick="window.completeFromModal(\'' + task.id + '\', \'' + dateStr + '\')">COMPLETE</button>' +
                                 '<button class="btn-delete" onclick="window.deleteFromModal(\'' + task.id + '\', \'' + dateStr + '\')">ABORT</button>' +
                                 '<button style="background:#c0a060; color:#000; border:none; border-radius:3px; padding:5px 10px; cursor:pointer;" onclick="window.moveTaskFromModal(\'' + task.id + '\', \'' + dateStr + '\')">MOVE</button>' +
                                 '</div>';
                }
                div.innerHTML = innerHTML; list.appendChild(div);
            }
        });

        if (list.innerHTML === '') list.innerHTML = '<div style="color:#888;">NO EVENTS</div>';
        modal.classList.remove('hidden');
    }

    // ==================== КНОПКИ В МОДАЛКЕ ЗАДАЧ ====================
    window.completeFromModal = function(id, dateStr) {
        completeTask(id);
        var d = new Date(dateStr + 'T12:00:00Z'); showDayDetails(dateStr, d);
    };

    window.deleteFromModal = function(id, dateStr) {
        deleteTask(id);
        var d = new Date(dateStr + 'T12:00:00Z'); showDayDetails(dateStr, d);
    };

    window.moveTaskFromModal = function(id, currentDateStr) {
        var newDate = prompt("Введите новую дату (Формат: ГГГГ-ММ-ДД):", currentDateStr);
        if (newDate) {
            var tasks = loadTasks();
            for(var i=0; i<tasks.length; i++) {
                if(tasks[i].id === id) { tasks[i].date = newDate; tasks[i].completed = false; break; }
            }
            saveTasks(tasks); renderTasks(); renderCalendar();
            document.getElementById('day-modal').classList.add('hidden'); showToast("Nero", "scold"); 
        }
    };

    // ==================== КНОПКИ В МОДАЛКЕ ПАР ====================
    window.deleteClass = function(id, dateStr) {
        if(confirm("Удалить эту пару?")) {
            var classes = loadClasses(); var filtered = classes.filter(c => c.id !== id);
            saveClasses(filtered); var d = new Date(dateStr + 'T12:00:00Z'); showDayDetails(dateStr, d);
        }
    };

    window.moveClass = function(id, currentDateStr) {
        var newDate = prompt("Введите новую дату (Формат: ГГГГ-ММ-ДД):", currentDateStr);
        if (newDate) {
            var classes = loadClasses();
            for(var i=0; i<classes.length; i++) { if(classes[i].id === id) { classes[i].date = newDate; break; } }
            saveClasses(classes); renderCalendar(); document.getElementById('day-modal').classList.add('hidden');
        }
    };

    window.editClass = function(id, dateStr) {
        var classes = loadClasses();
        for(var i=0; i<classes.length; i++) {
            if(classes[i].id === id) {
                var newTitle = prompt("Название предмета:", classes[i].title); if (newTitle === null) return; 
                var newRoom = prompt("Аудитория:", classes[i].room); if (newRoom === null) return;
                var newStart = prompt("Время начала (ЧЧ:ММ):", classes[i].startTime); if (newStart === null) return;
                var newEnd = prompt("Время конца (ЧЧ:ММ):", classes[i].endTime); if (newEnd === null) return;
                classes[i].title = newTitle; classes[i].room = newRoom; classes[i].startTime = newStart; classes[i].endTime = newEnd; break;
            }
        }
        saveClasses(classes); var d = new Date(dateStr + 'T12:00:00Z'); showDayDetails(dateStr, d);
    };

    var closeModalBtn = document.getElementById('close-modal');
    if(closeModalBtn) { closeModalBtn.addEventListener('click', function() { document.getElementById('day-modal').classList.add('hidden'); }); }

    // ==================== ЗАМЕТКИ ====================
    var saveNoteBtn = document.getElementById('save-note-btn');
    if(saveNoteBtn) {
        saveNoteBtn.addEventListener('click', function() {
            var dateStr = document.getElementById('modal-date-title').getAttribute('data-date');
            var noteText = document.getElementById('day-note-input').value;
            var notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};
            if (noteText.trim() === '') delete notes[dateStr]; else notes[dateStr] = noteText;
            localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); syncToCloud(); showToast("Dante", "praise"); 
        });
    }

    // ==================== НАВИГАЦИЯ ====================
    var prevWeekBtn = document.getElementById('prev-week');
    if(prevWeekBtn) {
        prevWeekBtn.addEventListener('click', function() {
            if (calendarView === 'week') currentDate.setDate(currentDate.getDate() - 7);
            else { currentDate.setDate(1); currentDate.setMonth(currentDate.getMonth() - 1); }
            renderCalendar();
        });
    }
    
    var nextWeekBtn = document.getElementById('next-week');
    if(nextWeekBtn) {
        nextWeekBtn.addEventListener('click', function() {
            if (calendarView === 'week') currentDate.setDate(currentDate.getDate() + 7);
            else { currentDate.setDate(1); currentDate.setMonth(currentDate.getMonth() + 1); }
            renderCalendar();
        });
    }

    var toggleViewBtn = document.getElementById('toggle-view');
    if(toggleViewBtn) {
        toggleViewBtn.addEventListener('click', function(e) {
            if (calendarView === 'week') { calendarView = 'month'; e.target.textContent = 'НЕДЕЛЯ'; }
            else { calendarView = 'week'; e.target.textContent = 'МЕСЯЦ'; }
            renderCalendar();
        });
    }

    var toggleArchiveBtn = document.getElementById('toggle-archive');
    if(toggleArchiveBtn) {
        toggleArchiveBtn.addEventListener('click', function(e) {
            isArchiveView = !isArchiveView;
            e.target.textContent = isArchiveView ? 'АКТИВНЫЕ' : 'АРХИВ';
            e.target.style.color = isArchiveView ? '#44aa44' : '#cc1a1a'; 
            renderCalendar();
        });
    }

    // ==================== ДОБАВЛЕНИЕ ПАР ====================
    var classTimePreset = document.getElementById('class-time-preset');
    var customTimeInputs = document.getElementById('custom-time-inputs');
    var classStartInput = document.getElementById('class-start');
    var classEndInput = document.getElementById('class-end');

    if (classTimePreset) {
        classTimePreset.addEventListener('change', function() {
            if (this.value === 'custom') {
                customTimeInputs.style.display = 'flex'; classStartInput.required = true; classEndInput.required = true;
            } else {
                customTimeInputs.style.display = 'none'; classStartInput.required = false; classEndInput.required = false;
            }
        });
    }

    var classForm = document.getElementById('class-form');
    if (classForm) {
        classForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var startTime = ''; var endTime = '';
            if (classTimePreset.value === 'custom') {
                startTime = classStartInput.value; endTime = classEndInput.value;
                if (!startTime || !endTime) { alert('Пожалуйста, укажите время начала и конца!'); return; }
            } else {
                var times = classTimePreset.value.split('-'); startTime = times[0]; endTime = times[1];
            }
            var classes = loadClasses();
            classes.push({
                id: Date.now().toString(), date: document.getElementById('class-date').value,
                startTime: startTime, endTime: endTime, title: document.getElementById('class-title').value,
                type: document.getElementById('class-type').value, room: document.getElementById('class-room').value
            });
            saveClasses(classes); this.reset(); 
            customTimeInputs.style.display = 'none'; classStartInput.required = false; classEndInput.required = false;
            renderCalendar();
        });
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    createHPSegments(); createDTSegments(); loadHP(); loadDT(); loadStyle(); renderTasks(); renderCalendar(); checkOverdueTasks(); checkDTReward(); 
    setInterval(checkOverdueTasks, 60000);

})();