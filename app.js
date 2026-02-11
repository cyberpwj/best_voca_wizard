document.addEventListener('DOMContentLoaded', () => {
    // === CONFIG ===
    const SLOTS_PER_PANEL = 40;
    const COL_SIZE = 20;
    const ACADEMY_NAME = "BestEdu English";
    const DEFAULT_LOGO = "./images/best_logo.png";

    // === ELEMENTS ===
    const bookSelect = document.getElementById('book-select');
    const unitStart = document.getElementById('unit-start');
    const unitEnd = document.getElementById('unit-end');
    const examMode = document.getElementById('exam-mode');
    const randomCountInput = document.getElementById('random-count');
    const generateBtn = document.getElementById('generate-btn');
    const printTestBtn = document.getElementById('print-test-btn');
    const printAnswerBtn = document.getElementById('print-answer-btn');
    const resetViewBtn = document.getElementById('reset-view-btn');

    const previewArea = document.getElementById('preview-area');
    const useCoverCheckbox = document.getElementById('use-cover');
    const exportBtn = document.getElementById('export-data-btn');

    // Teacher Elements
    const teacherSelect = document.getElementById('teacher-select');
    const addTeacherBtn = document.getElementById('add-teacher-btn');
    const editTeacherBtn = document.getElementById('edit-teacher-btn');
    const delTeacherBtn = document.getElementById('del-teacher-btn');
    const teacherModal = document.getElementById('teacher-modal');
    const teacherModalTitle = document.getElementById('teacher-modal-title');
    const teacherNameInput = document.getElementById('teacher-name-input');
    const saveTeacherBtn = document.getElementById('save-teacher-btn');
    const closeTeacherModalBtn = document.getElementById('close-teacher-modal-btn');


    // Modal Elements (Book)
    const addBookBtn = document.getElementById('add-book-btn');
    const editBookBtn = document.getElementById('edit-book-btn');
    const delBookBtn = document.getElementById('del-book-btn');
    const modalOverlay = document.getElementById('add-book-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveBookBtn = document.getElementById('save-book-btn');
    const newBookTitle = document.getElementById('new-book-title');
    const newBookCover = document.getElementById('new-book-cover');
    const newBookFile = document.getElementById('new-book-file');
    const editFileNote = document.getElementById('edit-file-note');

    // History Elements
    const historyBtn = document.getElementById('history-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyList = document.getElementById('history-list');
    const historyTeacherFilter = document.getElementById('history-teacher-filter');

    // State
    let isEditMode = false;
    let editingBookId = null;

    // Teacher State
    let TEACHER_LIST = [];
    let isTeacherEditMode = false;
    let editingTeacherIndex = -1;

    // History State
    let VOCAB_HISTORY = [];
    let currentExamData = null; // Stores the current exam context/content

    // === INITIALIZATION ===
    refreshBookSelect();
    loadTeachers();
    loadHistoryData();

    // === EVENT LISTENERS ===
    bookSelect.addEventListener('change', updateRange);

    // Split Print Handlers with better mobile support
    function cleanupPrintClasses() {
        document.body.classList.remove('printing-test');
        document.body.classList.remove('printing-answer');
        // Remove listeners to prevent memory leaks or unwanted firings (legacy)
        window.removeEventListener('focus', cleanupPrintClasses);
        document.removeEventListener('click', cleanupPrintClasses);
        document.removeEventListener('touchend', cleanupPrintClasses);
    }
    if (resetViewBtn) resetViewBtn.addEventListener('click', cleanupPrintClasses);

    function triggerPrint(type) {
        // 1. Cleanup any existing state first
        cleanupPrintClasses();

        // 2. Add class
        const cls = type === 'test' ? 'printing-test' : 'printing-answer';
        document.body.classList.add(cls);

        // 3. Wait for DOM update then Print
        setTimeout(() => {
            // Save History ONLY on Random Mode Print
            if (currentExamData && currentExamData.mode === 'random') {
                // Check for duplicates (optional, but good practice to avoid saving same gen twice if printed twice)
                // Use a simple timestamp check or make a new ID only on generation
                // Here we just check if ID exists
                const exists = VOCAB_HISTORY.find(x => x.id === currentExamData.id);
                if (!exists) {
                    VOCAB_HISTORY.push(currentExamData);
                    saveHistoryData();
                }
            }

            window.print();
            // No auto-cleanup listeners added. User must click "Reset View".
        }, 50);
    }

    printTestBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerPrint('test');
    });

    printAnswerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerPrint('answer');
    });

    generateBtn.addEventListener('click', generateExam);

    // --- Book Modal Handlers ---
    addBookBtn.addEventListener('click', () => {
        isEditMode = false;
        editingBookId = null;
        modalTitle.textContent = "단어장 추가 (Excel)";
        newBookTitle.value = "";
        newBookCover.value = "";
        newBookFile.value = "";
        editFileNote.textContent = "";
        modalOverlay.style.display = 'flex';
    });

    editBookBtn.addEventListener('click', () => {
        const bookId = bookSelect.value;
        if (!bookId) return alert("수정할 단어장을 선택해주세요.");

        const book = VOCAB_DATA[bookId];
        if (!book) return;

        isEditMode = true;
        editingBookId = bookId;
        modalTitle.textContent = "단어장 수정";
        newBookTitle.value = book.title;
        const imgPath = book.coverImage || "";
        newBookCover.value = imgPath.replace("./images/", "");

        editFileNote.textContent = "* 파일 미선택 시 기존 데이터 유지";
        newBookFile.value = "";
        modalOverlay.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => modalOverlay.style.display = 'none');
    saveBookBtn.addEventListener('click', handleSaveBook);

    delBookBtn.addEventListener('click', () => {
        const bookId = bookSelect.value;
        if (!bookId) return alert("삭제할 단어장을 선택해주세요.");
        if (confirm("정말로 이 단어장을 삭제하시겠습니까?")) {
            delete VOCAB_DATA[bookId];
            refreshBookSelect();
            unitStart.value = '';
            unitEnd.value = '';
            alert("삭제되었습니다.");
        }
    });

    exportBtn.addEventListener('click', handleExportData);

    // --- Teacher Modal Handlers ---
    addTeacherBtn.addEventListener('click', () => {
        isTeacherEditMode = false;
        teacherModalTitle.textContent = "선생님 이름 추가";
        teacherNameInput.value = "";
        teacherModal.style.display = 'flex';
    });

    editTeacherBtn.addEventListener('click', () => {
        const idx = teacherSelect.selectedIndex;
        // The first option is "선택 안 함" (value=""), so index 0 is valid but not editable as a teacher.
        // Wait, if value is empty, it's "None".
        const val = teacherSelect.value;
        if (!val) return alert("수정할 선생님 이름을 선택해주세요.");

        // Find index in TEACHER_LIST
        const listIndex = TEACHER_LIST.indexOf(val);
        if (listIndex === -1) return;

        isTeacherEditMode = true;
        editingTeacherIndex = listIndex;
        teacherModalTitle.textContent = "선생님 이름 수정";
        teacherNameInput.value = val;
        teacherModal.style.display = 'flex';
    });

    delTeacherBtn.addEventListener('click', () => {
        const val = teacherSelect.value;
        if (!val) return alert("삭제할 선생님 이름을 선택해주세요.");

        if (confirm(`'${val}' 선생님을 목록에서 삭제하시겠습니까?`)) {
            TEACHER_LIST = TEACHER_LIST.filter(t => t !== val);
            saveTeachers();
            refreshTeacherSelect();
        }
    });

    closeTeacherModalBtn.addEventListener('click', () => teacherModal.style.display = 'none');

    saveTeacherBtn.addEventListener('click', () => {
        const name = teacherNameInput.value.trim();
        if (!name) return alert("이름을 입력해주세요.");

        if (isTeacherEditMode) {
            TEACHER_LIST[editingTeacherIndex] = name;
        } else {
            TEACHER_LIST.push(name);
        }

        saveTeachers();
        refreshTeacherSelect();
        // Select the newly added/edited teacher
        teacherSelect.value = name;
        teacherModal.style.display = 'none';
        teacherSelect.value = name;
        teacherModal.style.display = 'none';
    });


    // --- History Handlers ---
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            refreshHistoryFilter();
            renderHistoryList();
            historyModal.style.display = 'flex';
        });
    }

    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => historyModal.style.display = 'none');
    }

    if (historyTeacherFilter) {
        historyTeacherFilter.addEventListener('change', () => renderHistoryList(historyTeacherFilter.value));
    }


    // === FUNCTIONS ===

    // Teacher Logic
    function loadTeachers() {
        // 1. Load from LocalStorage
        const stored = localStorage.getItem('VOCAB_TEACHERS');
        let localTeachers = [];
        if (stored) {
            try {
                localTeachers = JSON.parse(stored);
            } catch (e) {
                localTeachers = [];
            }
        }

        // 2. Load from Exported Data (data_loader.js)
        let exportedTeachers = [];
        if (typeof VOCAB_TEACHERS_DATA !== 'undefined' && Array.isArray(VOCAB_TEACHERS_DATA)) {
            exportedTeachers = VOCAB_TEACHERS_DATA;
        }

        // 3. Merge (Unique)
        // Combine both sources, remove duplicates
        const merged = Array.from(new Set([...localTeachers, ...exportedTeachers]));

        TEACHER_LIST = merged;

        // Update LocalStorage with the merged list so it persists
        saveTeachers();

        refreshTeacherSelect();
    }

    function saveTeachers() {
        localStorage.setItem('VOCAB_TEACHERS', JSON.stringify(TEACHER_LIST));
    }

    refreshTeacherSelect();

    // History Logic
    function loadHistoryData() {
        // 1. Load from LocalStorage
        const stored = localStorage.getItem('VOCAB_HISTORY');
        let localHistory = [];
        if (stored) {
            try {
                localHistory = JSON.parse(stored);
            } catch (e) {
                localHistory = [];
            }
        }

        // 2. Load from Exported Data (data_loader.js)
        let exportedHistory = [];
        if (typeof VOCAB_HISTORY_DATA !== 'undefined' && Array.isArray(VOCAB_HISTORY_DATA)) {
            exportedHistory = VOCAB_HISTORY_DATA;
        }

        // 3. Merge (Unique by ID)
        // Combine both, then filter by ID to keep only unique entries
        const combined = [...localHistory, ...exportedHistory];
        const uniqueMap = new Map();
        combined.forEach(item => {
            if (!uniqueMap.has(item.id)) {
                uniqueMap.set(item.id, item);
            }
        });

        VOCAB_HISTORY = Array.from(uniqueMap.values());

        // Update LocalStorage so it stays synced
        saveHistoryData();
    }

    function saveHistoryData() {
        // Limit history to last 50 items to prevent storage overflow
        if (VOCAB_HISTORY.length > 50) {
            VOCAB_HISTORY = VOCAB_HISTORY.slice(0, 50);
        }
        try {
            localStorage.setItem('VOCAB_HISTORY', JSON.stringify(VOCAB_HISTORY));
        } catch (e) {
            alert('브라우저 용량 부족으로 기록을 저장할 수 없습니다.');
        }
    }

    function refreshHistoryFilter() {
        // Populate teacher filter in history modal
        // Get unique teachers from history
        const teachers = Array.from(new Set(VOCAB_HISTORY.map(item => item.ctx.teacherName).filter(t => t)));
        historyTeacherFilter.innerHTML = '<option value="">전체 보기</option>';
        teachers.forEach(t => {
            const op = document.createElement('option');
            op.value = t;
            op.textContent = t;
            historyTeacherFilter.appendChild(op);
        });
    }

    function renderHistoryList(filterTeacher = "") {
        historyList.innerHTML = "";

        let list = [...VOCAB_HISTORY];
        // Sort by Date Descending
        list.sort((a, b) => b.id - a.id);

        if (filterTeacher) {
            list = list.filter(item => item.ctx.teacherName === filterTeacher);
        }

        if (list.length === 0) {
            historyList.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">기록이 없습니다.</div>';
            return;
        }

        list.forEach(item => {
            const dateObj = new Date(item.id);
            const dateStr = dateObj.toLocaleString();

            const teacher = item.ctx.teacherName || "선생님 미지정";
            const range = `Unit ${item.range.start} ~ ${item.range.end}`;
            const comment = item.comment || ""; // Default empty string

            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-info">
                    <h4>${item.bookTitle} <span style="font-size:0.8em; font-weight:normal; color:#666;">(${range})</span></h4>
                    <div class="history-meta">
                        📅 ${dateStr} | 👨‍🏫 ${teacher} | 🎲 Random (${item.ctx.testType})
                    </div>
                </div>
                <div class="history-comment" style="flex: 1; margin: 0 15px;">
                    <input type="text" class="h-comment-input" value="${comment}" placeholder="코멘트 (예: A반)" 
                           style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9em;">
                </div>
                <div class="history-actions">
                    <button class="h-btn h-print-test">📄 시험지</button>
                    <button class="h-btn h-print-ans">✅ 정답지</button>
                    <button class="h-btn h-del">🗑</button>
                </div>
            `;

            // Bind Events
            div.querySelector('.h-print-test').addEventListener('click', () => loadAndPrint(item, 'test'));
            div.querySelector('.h-print-ans').addEventListener('click', () => loadAndPrint(item, 'answer'));
            div.querySelector('.h-del').addEventListener('click', () => deleteHistoryItem(item.id));

            // Comment Auto-Save event
            const commentInput = div.querySelector('.h-comment-input');
            commentInput.addEventListener('change', (e) => {
                const newComment = e.target.value;
                item.comment = newComment;
                saveHistoryData();
                // Optional: visual feedback
                e.target.style.borderColor = "#4ade80"; // Turn green briefly
                setTimeout(() => e.target.style.borderColor = "#ddd", 1000);
            });

            historyList.appendChild(div);
        });
    }

    function deleteHistoryItem(id) {
        if (!confirm("이 기록을 삭제하시겠습니까?")) return;
        VOCAB_HISTORY = VOCAB_HISTORY.filter(x => x.id !== id);
        saveHistoryData();
        renderHistoryList(historyTeacherFilter.value);
    }

    function loadAndPrint(item, type) {
        // Restore Exam Generation
        // Reuse render logic
        const { panels, ctx } = item;

        previewArea.innerHTML = '';
        const useCover = true; // Force cover or maybe use saved setting? Let's assume true or use default logic.
        // Actually, let's just use standard rendering.

        // 1. Cover Page (Exam)
        const coverEl = createCoverPage({
            title: item.bookTitle,
            subTitle: `Random (Unit ${item.range.start} ~ ${item.range.end})`,
            bookCover: item.bookCover,
            isAnswer: false,
            ...ctx
        });
        coverEl.classList.add('cover-page-exam');
        previewArea.appendChild(coverEl);

        // 2. Questions
        const qContainer = document.createElement('div');
        qContainer.className = 'section-exam';
        renderPages(panels, { isAnswer: false, ...ctx }, qContainer);
        previewArea.appendChild(qContainer);

        // 3. Separator
        const br = document.createElement('div');
        br.className = 'no-print answer-divider';
        br.style.cssText = 'text-align:center; padding:20px; font-weight:bold; color:#444;';
        br.innerHTML = '⬇️ ANSWER KEY ⬇️';
        previewArea.appendChild(br);

        // 4. Cover Page (Answer)
        const answerCoverEl = createCoverPage({
            title: item.bookTitle,
            subTitle: `Random (Unit ${item.range.start} ~ ${item.range.end})`,
            bookCover: item.bookCover,
            isAnswer: true,
            ...ctx
        });
        answerCoverEl.classList.add('cover-page-answer');
        previewArea.appendChild(answerCoverEl);

        // 5. Answers
        const aContainer = document.createElement('div');
        aContainer.className = 'section-answer';
        renderPages(panels, { isAnswer: true, ...ctx }, aContainer);
        previewArea.appendChild(aContainer);

        // Close modal and Print
        historyModal.style.display = 'none';

        // Wait for render then print
        setTimeout(() => {
            fitSheetsToScreen();
            triggerPrint(type);
        }, 300);
    }

    function refreshTeacherSelect() {
        const currentVal = teacherSelect.value;
        teacherSelect.innerHTML = '<option value="">선택 안 함</option>';
        TEACHER_LIST.forEach(name => {
            const op = document.createElement('option');
            op.value = name;
            op.textContent = name;
            teacherSelect.appendChild(op);
        });
        if (TEACHER_LIST.includes(currentVal)) teacherSelect.value = currentVal;
    }


    function refreshBookSelect() {
        const currentVal = bookSelect.value;
        bookSelect.innerHTML = '<option value="">선택하세요</option>';
        const books = getBooks();
        books.forEach(b => {
            const op = document.createElement('option');
            op.value = b.id;
            op.textContent = b.title;
            bookSelect.appendChild(op);
        });
        if (VOCAB_DATA[currentVal]) bookSelect.value = currentVal;
        else bookSelect.value = "";
    }

    function updateRange() {
        const books = getBooks();
        const b = books.find(x => x.id === bookSelect.value);
        if (b) {
            unitStart.value = 1;
            unitEnd.value = b.maxUnit;
            unitStart.max = b.maxUnit;
            unitEnd.max = b.maxUnit;
        }
    }

    // Helper: Shuffle Array
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async function handleSaveBook() {
        const title = newBookTitle.value.trim();
        const fileName = newBookCover.value.trim();
        const excelfile = newBookFile.files[0];

        if (!title) return alert("단어장 이름을 입력해주세요.");
        if (!isEditMode && !excelfile) return alert("엑셀 파일을 선택해주세요.");

        try {
            let finalCoverPath = null;
            if (fileName) {
                const cleanName = fileName.replace(/^.*[\\\/]/, '');
                if (cleanName.startsWith("./images/")) finalCoverPath = cleanName;
                else finalCoverPath = "./images/" + cleanName;
            }

            let parsedData = null;
            let maxUnit = 0;

            if (excelfile) {
                const data = await readExcelFile(excelfile);
                parsedData = {};
                data.forEach(row => {
                    let day = row['Day'] || row['Unit'] || row['day'] || row['unit'];
                    let eng = row['영어'] || row['English'] || row['english'] || row['단어'];
                    let kor = row['한글'] || row['Korean'] || row['korean'] || row['뜻'] || row['의미'];
                    if (!day || !eng || !kor) return;
                    day = parseInt(day);
                    if (isNaN(day)) return;

                    if (!parsedData[day]) parsedData[day] = [];
                    parsedData[day].push({ eng, kor });
                    if (day > maxUnit) maxUnit = day;
                });

                // SHUFFLE LOGIC: Once per upload
                Object.keys(parsedData).forEach(u => {
                    shuffleArray(parsedData[u]);
                });

                if (Object.keys(parsedData).length === 0) return alert("엑셀 데이터 오류: 컬럼명 확인");
            }

            if (isEditMode) {
                const existing = VOCAB_DATA[editingBookId];
                existing.title = title;
                if (finalCoverPath !== null) existing.coverImage = finalCoverPath;
                if (parsedData) {
                    existing.data = parsedData;
                    existing.units = maxUnit;
                }
                alert("수정되었습니다. (단어 순서가 섞인 상태로 저장됨)");
            } else {
                const newBookId = "UserBook_" + Date.now();
                VOCAB_DATA[newBookId] = {
                    title: title,
                    units: maxUnit,
                    coverImage: finalCoverPath,
                    data: parsedData
                };
                editingBookId = newBookId;
                alert("추가되었습니다. (단어 순서가 섞인 상태로 저장됨)");
            }

            refreshBookSelect();
            bookSelect.value = editingBookId;
            updateRange();
            modalOverlay.style.display = 'none';

        } catch (e) {
            console.error(e);
            alert("오류 발생: " + e.message);
        }
    }

    function readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                resolve(XLSX.utils.sheet_to_json(firstSheet));
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function handleExportData() {
        if (!confirm("현재 등록된 단어장, 선생님 리스트, 인쇄 기록을 모두 내보냅니다. (data_loader.js 파일 저장)")) return;
        const jsonStr = JSON.stringify(VOCAB_DATA, null, 4);
        const teachersStr = JSON.stringify(TEACHER_LIST, null, 4);
        const historyStr = JSON.stringify(VOCAB_HISTORY, null, 4);

        const jsContent = `// Voca Builder Data File
// Exported on ${new Date().toLocaleString()}

const VOCAB_DATA = ${jsonStr};

const VOCAB_TEACHERS_DATA = ${teachersStr};

const VOCAB_HISTORY_DATA = ${historyStr};

function getBooks(){ return Object.keys(VOCAB_DATA).map(k=>({id:k, title:VOCAB_DATA[k].title, maxUnit:VOCAB_DATA[k].units, coverImage:VOCAB_DATA[k].coverImage})); }
function getUnitData(bookId, unitNum){ const book=VOCAB_DATA[bookId]; if(!book||!book.data[unitNum])return[]; return book.data[unitNum]; }`;

        const blob = new Blob([jsContent], { type: "text/javascript;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "data_loader.js";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function generateExam() {
        const bookId = bookSelect.value;
        if (!bookId) return alert('단어장을 선택해주세요.');

        const selectedBook = getBooks().find(b => b.id === bookId);
        if (!selectedBook) return alert('단어장 정보를 찾을 수 없습니다.');

        const uStart = parseInt(unitStart.value);
        const uEnd = parseInt(unitEnd.value);
        if (isNaN(uStart) || isNaN(uEnd) || uStart > uEnd) return alert('범위를 확인해주세요.');

        const mode = examMode.value;
        const testType = document.querySelector('input[name="test-type"]:checked').value;
        const useCover = useCoverCheckbox ? useCoverCheckbox.checked : false;

        // Context Data
        const teacherName = teacherSelect.value; // May be empty
        // Date Format: [2026 - 01 - 19]
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const dateStr = `[${y} - ${m} - ${d}]`;

        // Store Current Exam Context
        currentExamData = {
            id: Date.now(),
            mode: mode,
            bookTitle: selectedBook.title,
            bookCover: selectedBook.coverImage,
            range: { start: uStart, end: uEnd },
            ctx: {
                testType,
                academyName: ACADEMY_NAME,
                logo: DEFAULT_LOGO,
                teacherName,
                dateStr
            },
            panels: [] // Will fill below
        };

        let panelsData = [];
        if (mode === 'random') {
            let allWords = [];
            for (let u = uStart; u <= uEnd; u++) allWords = allWords.concat(getUnitData(bookId, u));

            // Random mode re-shuffles for the test
            allWords.sort(() => Math.random() - 0.5);

            const limit = parseInt(randomCountInput.value) || 80;
            allWords = allWords.slice(0, limit);
            for (let i = 0; i < allWords.length; i += SLOTS_PER_PANEL) {
                panelsData.push({
                    title: `${selectedBook.title} Random Part ${(i / SLOTS_PER_PANEL) + 1}`,
                    words: allWords.slice(i, i + SLOTS_PER_PANEL)
                });
            }
        } else {
            // RANGE MODE
            for (let u = uStart; u <= uEnd; u++) {
                panelsData.push({ title: `${selectedBook.title} Unit ${u}`, words: getUnitData(bookId, u) });
            }
        }

        // Save panels to history data
        currentExamData.panels = panelsData;

        const ctx = currentExamData.ctx;

        previewArea.innerHTML = '';

        // 1. Cover Page (Exam)
        if (useCover) {
            const coverEl = createCoverPage({
                title: selectedBook.title,
                subTitle: mode === 'random' ? `Random (Unit ${uStart} ~ ${uEnd})` : `Unit ${uStart} ~ ${uEnd}`,
                bookCover: selectedBook.coverImage,
                isAnswer: false,
                ...ctx
            });
            coverEl.classList.add('cover-page-exam');
            previewArea.appendChild(coverEl);
        }

        // 2. Questions (Wrapped)
        const qContainer = document.createElement('div');
        qContainer.className = 'section-exam';
        renderPages(panelsData, { isAnswer: false, ...ctx }, qContainer);
        previewArea.appendChild(qContainer);

        // 3. Separator
        const br = document.createElement('div');
        br.className = 'no-print answer-divider';
        br.style.cssText = 'text-align:center; padding:20px; font-weight:bold; color:#444;';
        br.innerHTML = '⬇️ ANSWER KEY ⬇️';
        previewArea.appendChild(br);

        // 4. Cover Page (Answer)
        if (useCover) {
            const answerCoverEl = createCoverPage({
                title: selectedBook.title,
                subTitle: mode === 'random' ? `Random (Unit ${uStart} ~ ${uEnd})` : `Unit ${uStart} ~ ${uEnd}`, // REVERTED: Show range even in RANDOM mode as per user request
                bookCover: selectedBook.coverImage,
                isAnswer: true,
                ...ctx
            });
            answerCoverEl.classList.add('cover-page-answer');
            previewArea.appendChild(answerCoverEl);
        }

        // 5. Answers (Wrapped)
        const aContainer = document.createElement('div');
        aContainer.className = 'section-answer';
        renderPages(panelsData, { isAnswer: true, ...ctx }, aContainer);
        previewArea.appendChild(aContainer);
    }

    function renderPages(panels, options, container) {
        for (let i = 0; i < panels.length; i += 2) {
            container.appendChild(createLandscapePage(panels[i], panels[i + 1] || null, options));
        }
    }

    function createLandscapePage(p1, p2, options) {
        const page = document.createElement('div');
        page.className = 'sheet-container';
        page.appendChild(createPanel(p1, options));
        const div = document.createElement('div'); div.className = 'sheet-divider'; page.appendChild(div);
        if (p2) page.appendChild(createPanel(p2, options));
        else { const e = document.createElement('div'); e.className = 'exam-panel'; page.appendChild(e); }
        return page;
    }

    function createPanel(data, options) {
        const panel = document.createElement('div');
        panel.className = 'exam-panel';

        // Header Info Logic
        let infoHtml = '';
        if (options.isAnswer) {
            infoHtml = ``;
        } else {
            // Exam Sheet: Date and Score
            infoHtml = `
                <div class="header-info" style="justify-content: flex-end; gap: 20px;">
                    <span>Date: __________</span>
                    <span>Score: __________</span>
                </div>
            `;
        }

        const headerHtml = `
            <div class="panel-header">
                <div class="header-top">
                    <img src="${options.logo}" class="mini-logo" onerror="this.style.display='none'">
                    <h2 class="panel-title">${data.title}</h2>
                </div>
                ${infoHtml}
            </div>
        `;

        let bodyHtml = `<div class="panel-body">`;
        bodyHtml += `<div class="panel-sub-col">`;
        for (let i = 0; i < COL_SIZE; i++) bodyHtml += createItemHtml(i, data.words[i], options);
        bodyHtml += `</div>`;
        bodyHtml += `<div class="panel-sub-col" style="border-left: 2px solid #0f172a; padding-left: 3mm; margin-left: 2mm;">`;
        for (let i = COL_SIZE; i < SLOTS_PER_PANEL; i++) bodyHtml += createItemHtml(i, data.words[i], options);
        bodyHtml += `</div></div>`;

        const footerHtml = `<div class="panel-footer">${options.academyName}</div>`;
        panel.innerHTML = headerHtml + bodyHtml + footerHtml;
        return panel;
    }

    function createItemHtml(index, word, options) {
        const num = index + 1;

        const numHtml = `<div class="q-num">${num}.</div>`;
        let wordBoxHtml = '';
        let inputBoxHtml = '';

        if (!word) {
            wordBoxHtml = `<div class="q-word-box"></div>`;
            inputBoxHtml = `<div class="q-input-box"><div class="q-content-empty"></div></div>`;
        } else if (options.isAnswer) {
            wordBoxHtml = `<div class="q-word-box"><span class="q-word-ans">${word.eng}</span></div>`;
            inputBoxHtml = `<div class="q-input-box"><span class="q-mean-ans">${word.kor}</span></div>`;
        } else {
            if (options.testType === 'meaning') {
                wordBoxHtml = `<div class="q-word-box"><span class="q-word">${word.eng}</span></div>`;
                inputBoxHtml = `<div class="q-input-box"><div class="q-input-line"></div></div>`;
            } else {
                wordBoxHtml = `<div class="q-word-box"></div>`;
                inputBoxHtml = `<div class="q-input-box"><span class="q-mean-ans">${word.kor}</span></div>`;
            }
        }
        return `<div class="q-item">${numHtml}${wordBoxHtml}${inputBoxHtml}</div>`;
    }

    function createCoverPage(ctx) {
        const page = document.createElement('div');
        page.className = 'sheet-container';

        const imgHtml = ctx.bookCover
            ? `<img src="${ctx.bookCover}" class="cover-book-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
               <div style="display:none; color:#ccc; text-align:center;">NO IMAGE</div>`
            : `<div style="text-align:center; color:#ccc;">NO BOOK COVER IMAGE</div>`;

        const testTypeLabel = ctx.testType === 'meaning' ? '한글 뜻 테스트' : 'Spelling 테스트';

        // Right Side Content
        let centerContentHtml = '';

        // Prepare Info Box Content
        // Start: Date string
        // Teacher: Teacher Name or blank
        // Name: Blank (Only for Exam usually, but user asked for similar)
        const dateDisplay = ctx.dateStr;
        const teacherDisplay = ctx.teacherName || "__________";

        const infoBoxHtml = `
            <div class="cover-bottom-content">
                <div class="cover-info-box">
                    <div class="cover-row"><span>Date</span><span>${dateDisplay}</span></div>
                    <div class="cover-row"><span>Teacher</span><span>${teacherDisplay}</span></div>
                    ${!ctx.isAnswer ? `<div class="cover-row"><span>Name</span><span>__________</span></div>` : ''}
                </div>
            </div>
        `;

        if (ctx.isAnswer) {
            // Answer Key: Centered Text "정 답 지" AND Info Box
            centerContentHtml = `
                <div class="cover-center-content" style="flex-direction:column;">
                    <div class="cover-answer-mark">정 답 지</div>
                </div>
                ${infoBoxHtml}
            `;
        } else {
            // Exam: Info Box (Start, Teacher, Name) - Positioned towards bottom
            centerContentHtml = infoBoxHtml;
        }

        page.innerHTML = `
            <div class="cover-container">
                <div class="cover-left">
                    <div class="cover-img-wrapper">
                        ${imgHtml}
                    </div>
                    <div class="cover-test-type">${testTypeLabel}</div>
                </div>
                <div class="cover-right">
                    <div class="cover-title-group">
                        <div class="cover-main-title">${ctx.title}</div>
                        <div class="cover-sub-title">${ctx.subTitle}</div>
                    </div>
                    ${centerContentHtml}
                    <img src="${ctx.logo}" class="cover-logo-bottom" onerror="this.style.display='none'">
                </div>
            </div>
        `;
        return page;
    }

    // === MOBILE RESPONSIVE LOGIC ===
    const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
    const sidebar = document.getElementById('sidebar');

    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mobileToggleBtn.textContent = sidebar.classList.contains('active') ? '설정 닫기 ▲' : '설정 열기 ▼';
        });
    }

    // Auto-Scale Sheets for Mobile
    function fitSheetsToScreen() {
        const sheets = document.querySelectorAll('.sheet-container');
        if (sheets.length === 0) return;

        const previewArea = document.getElementById('preview-area');
        if (!previewArea) return;

        // Subtract padding (20px left/right approx)
        const containerWidth = previewArea.clientWidth - 20;

        // Base width of A4 Sheet defined in CSS (296mm ~ 1118px)
        // We use offsetWidth of the first sheet to get the exact rendered pixel width
        const baseWidth = sheets[0].offsetWidth || 1118;

        if (containerWidth < baseWidth) {
            const scale = containerWidth / baseWidth;
            sheets.forEach(sheet => {
                sheet.style.transform = `scale(${scale})`;
                // Compensate for the empty space caused by scaling
                // Height reduces as well
                const heightReduction = sheet.offsetHeight * (1 - scale);
                sheet.style.marginBottom = `-${heightReduction}px`;
                // Width reduction compensation (centering effectively)
                // Since Transform Origin is Top Left, we don't need margin-left adj if we want left align.
            });
        } else {
            // Reset
            sheets.forEach(sheet => {
                sheet.style.transform = 'none';
                sheet.style.marginBottom = '30px'; // Default bottom margin
            });
        }
    }

    // Call on resize
    window.addEventListener('resize', fitSheetsToScreen);

    // Call fitSheetsToScreen after generation
    // Instead of replacing the handler, we just add another one that runs after.
    // Since JS event listeners run in order, we can just add a new click listener.
    generateBtn.addEventListener('click', () => {
        // Apply scaling
        setTimeout(fitSheetsToScreen, 100);
    });

    // Initial call
    fitSheetsToScreen();
});
