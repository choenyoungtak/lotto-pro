function trendRecommend() {
    if (!lottoData || lottoData.length === 0) {
        alert("로또 데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        return;
    }

    // 1. 선택된 회차 가져오기
    const roundSelect = document.getElementById("roundSelect");
    if (!roundSelect) {
        alert("회차 선택 드롭다운을 찾을 수 없습니다.");
        return;
    }

    const selectedRound = Number(roundSelect.value);
    if (!selectedRound || isNaN(selectedRound)) {
        alert("선택된 회차 정보를 확인할 수 없습니다.");
        return;
    }

    // 2. 선택한 회차 이하(N회차 포함 및 이전 회차) 데이터 필터링[cite: 9]
    const filteredData = lottoData.filter(draw => {
        const round = Number(draw["회차"] || draw.round);
        return !isNaN(round) && round <= selectedRound;
    });

    if (filteredData.length === 0) {
        alert(`선택한 [${selectedRound}회차] 이전 데이터가 없습니다.`);
        return;
    }

    // 3. 선택한 회차 기준 가장 최근 30회차 데이터 추출[cite: 9]
    const recent30 = filteredData.slice(0, 30);

    // 4. 최근 30회차 동안의 출현 빈도 계산[cite: 9]
    const freq = new Array(46).fill(0);
    recent30.forEach(draw => {
        const numbers = draw["당첨번호"] || draw.numbers;
        if (Array.isArray(numbers)) {
            numbers.forEach(num => {
                if (num >= 1 && num <= 45) {
                    freq[num]++;
                }
            });
        }
    });

    // 5. 출현 빈도를 가중치로 설정[cite: 9]
    const weights = new Array(46).fill(0);
    for (let i = 1; i <= 45; i++) {
        weights[i] = freq[i] + 1;
    }

    // 6. 가중치 기반 최근추세 추천 5세트 생성[cite: 9]
    const sets = [];
    let attempts = 0;

    while (sets.length < 5 && attempts < 1000) {
        attempts++;
        const selected = generateWeightedNumbers(weights);

        const setStr = selected.join(",");
        if (!sets.some(s => s.join(",") === setStr)) {
            sets.push(selected);
        }
    }

    const title = `📈 [${selectedRound}회차 기준 최근 30회] 최근추세 추천 (5세트)`;

    // 7. 화면 출력 및 [종합 보내기] 버튼 포함 렌더링 처리[cite: 9]
    if (typeof showRecommend === "function") {
        showRecommend(title, sets);
        injectTrendBasketButtons();
    } else {
        renderDefaultTrendView(title, sets);
    }

    // [중요] 최근추세 분석 완료 상태 체크 실행[cite: 9]
    if (typeof markAnalysisComplete === "function") {
        markAnalysisComplete('trend');
    }
}

// 가중치 기반 무작위 추출 함수[cite: 9]
function generateWeightedNumbers(weights) {
    const numbers = [];
    const available = Array.from({ length: 45 }, (_, i) => i + 1);
    const currentWeights = [...weights];

    while (numbers.length < 6) {
        let totalWeight = 0;
        for (let i = 1; i <= 45; i++) {
            if (available.includes(i)) totalWeight += currentWeights[i];
        }

        let random = Math.random() * totalWeight;
        for (let num of available) {
            random -= currentWeights[num];
            if (random <= 0) {
                numbers.push(num);
                available.splice(available.indexOf(num), 1);
                break;
            }
        }
    }

    return numbers.sort((a, b) => a - b);
}

// 기본 뷰어 (showRecommend가 없을 때 대비 및 [종합 보내기] 버튼 포함)[cite: 9]
function renderDefaultTrendView(title, sets) {
    const recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    let html = `
        <div class="recommend-card" style="padding: 25px;">
            <div class="recommend-header" style="margin-bottom: 20px;"><span style="font-size: 1.15rem; font-weight: 800;">${title}</span></div>
            <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 15px;">
    `;

    sets.forEach((set, idx) => {
        const setStr = set.join(",");
        const resultSpanId = `check-result-trend-${idx}`;
        const containerId = `ball-container-trend-${idx}`;
        const ballsHtml = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

        html += `
            <div class="recommend-row" style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.35); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px;">
                <span class="set-tag" style="color: #38bdf8; font-weight: 700; min-width: 90px;">[세트 ${idx + 1}]</span>
                <div id="${containerId}" class="lotto-ball-wrapper" style="display: flex; gap: 10px; align-items: center;">${ballsHtml}</div>
                <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                    <button class="btn-inline-check" style="background: #0284c7; color: white; padding: 8px 14px;" onclick="sendToComprehensiveBasket('최근추세 세트 ${idx + 1}', '${setStr}', '최근추세')">종합 보내기</button>
                    <button class="btn-inline-check" style="padding: 8px 14px;" onclick="checkWinForNumbers('${setStr}', '${resultSpanId}', '${containerId}')">당첨 확인</button>
                    <span id="${resultSpanId}" class="result-text" style="font-size: 0.9rem;"></span>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    recommendDiv.innerHTML = html;
}

// showRecommend 사용 시 당첨 확인 버튼 옆에 [종합 보내기] 버튼을 동적으로 주입하는 헬퍼 함수[cite: 9]
function injectTrendBasketButtons() {
    const rows = document.querySelectorAll("#recommend .recommend-row");
    rows.forEach((row, idx) => {
        if (row.querySelector(".btn-basket-injected")) return;

        // 행 레이아웃 스타일 적용
        row.style.cssText = "background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.35); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 12px;";

        const ballWrapper = row.querySelector(".lotto-ball-wrapper");
        if (ballWrapper) {
            ballWrapper.style.cssText = "display: flex; gap: 10px; align-items: center;";
        }

        const checkBtn = row.querySelector(".btn-inline-check");
        if (checkBtn) {
            checkBtn.style.padding = "8px 14px";
            const setTag = row.querySelector(".set-tag") ? row.querySelector(".set-tag").innerText : `세트 ${idx + 1}`;
            if (ballWrapper) {
                const numbers = Array.from(ballWrapper.querySelectorAll(".lotto-ball, span")).map(el => el.textContent.trim()).filter(n => !isNaN(n) && n !== "").join(",");
                if (numbers) {
                    const basketBtn = document.createElement("button");
                    basketBtn.className = "btn-inline-check btn-basket-injected";
                    basketBtn.style.cssText = "background: #0284c7; color: white; padding: 8px 14px; margin-right: 8px;";
                    basketBtn.innerText = "종합 보내기";
                    basketBtn.onclick = function() {
                        sendToComprehensiveBasket(`추세 ${setTag}`, numbers, '최근추세');
                    };
                    checkBtn.parentNode.insertBefore(basketBtn, checkBtn);
                }
            }
        }
    });
}

// 분석 완료 상태 등록[cite: 9]
if (typeof markAnalysisComplete === "function") {
    markAnalysisComplete('trend');
}