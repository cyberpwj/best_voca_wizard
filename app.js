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
    // const printBtn = document.getElementById('print-btn'); // REMOVED
    const printTestBtn = document.getElementById('print-test-btn');
    const printAnswerBtn = document.getElementById('print-answer-btn');

    const previewArea = document.getElementById('preview-area');
    const useCoverCheckbox = document.getElementById('use-cover');
    const exportBtn = document.getElementById('export-data-btn');

    // Modal Elements
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

    // State
    let isEditMode = false;
    let editingBookId = null;

    // === INITIALIZATION ===
    refreshBookSelect();

    // === EVENT LISTENERS ===
    bookSelect.addEventListener('change', updateRange);

    // Split Print Handlers
    printTestBtn.addEventListener('click', () => {
        document.body.classList.add('printing-test');
        window.print();
        document.body.classList.remove('printing-test');
    });
    printAnswerBtn.addEventListener('click', () => {
        document.body.classList.add('printing-answer');
        window.print();
        document.body.classList.remove('printing-answer');
    });

    generateBtn.addEventListener('click', generateExam);

    // Modal: ADD
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

    // Modal: EDIT
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


    // === FUNCTIONS ===

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
        if (!confirm("현재 등록된 단어장 데이터를 내보냅니다. (data_loader.js 파일 저장)")) return;
        const jsonStr = JSON.stringify(VOCAB_DATA, null, 4);
        const jsContent = `// Voca Builder Data File\n// Exported on ${new Date().toLocaleString()}\n\nconst VOCAB_DATA = ${jsonStr};\n\nfunction getBooks(){ return Object.keys(VOCAB_DATA).map(k=>({id:k, title:VOCAB_DATA[k].title, maxUnit:VOCAB_DATA[k].units, coverImage:VOCAB_DATA[k].coverImage})); }\nfunction getUnitData(bookId, unitNum){ const book=VOCAB_DATA[bookId]; if(!book||!book.data[unitNum])return[]; return book.data[unitNum]; }`;

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

        let panelsData = [];
        if (mode === 'random') {
            let allWords = [];
            for (let u = uStart; u <= uEnd; u++) allWords = allWords.concat(getUnitData(bookId, u)); // Uses stored order (which is already shuffled on upload)

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
            // RANGE MODE: Just sequential units
            for (let u = uStart; u <= uEnd; u++) {
                panelsData.push({ title: `${selectedBook.title} Unit ${u}`, words: getUnitData(bookId, u) });
            }
        }

        const ctx = { testType, academyName: ACADEMY_NAME, logo: DEFAULT_LOGO };

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
                subTitle: mode === 'random' ? 'Random Test' : `Unit ${uStart} ~ ${uEnd}`,
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
            // Answer Key: No info fields needed
            infoHtml = ``;
        } else {
            // Exam Sheet: Only Date and Score, Right Aligned
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
                // Spelling Test: Layout like Answer Key (Left: Empty for specific writing, Right: Korean)
                // This fixes the issue where long Korean meanings break the fixed-width Left column.
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

        if (ctx.isAnswer) {
            // Answer Key: Centered Text
            centerContentHtml = `
                <div class="cover-center-content">
                    <div class="cover-answer-mark">정 답 지</div>
                </div>
            `;
        } else {
            // Exam: Info Box (Start, Teacher, Name) - Positioned towards bottom
            centerContentHtml = `
                <div class="cover-bottom-content">
                    <div class="cover-info-box">
                        <div class="cover-row"><span>Start</span><span>__________</span></div>
                        <div class="cover-row"><span>Teacher</span><span>__________</span></div>
                        <div class="cover-row"><span>Name</span><span>__________</span></div>
                    </div>
                </div>
            `;
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
});
