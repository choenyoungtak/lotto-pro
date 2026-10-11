function getFrequency() {
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

    // 2. 선택한 회차 이하(N회차 포함 및 이전 회차) 데이터만 필터링[cite: 15]
    const filteredData = lottoData.filter(draw => {
        const round = Number(draw["회차"] || draw.round);
        return !isNaN(round) && round <= selectedRound;
    });

    if (filteredData.length === 0) {
        alert(`선택한 [${selectedRound}회차] 이전 데이터가 없습니다.`);
        return;
    }

    // 3. 해당 시점 기준 출현 빈도 계산[cite: 15]
    const freq = new Array(46).fill(0);
    filteredData.forEach(draw => {
        const numbers = draw["당첨번호"] || draw.numbers;
        if (Array.isArray(numbers)) {
            numbers.forEach(num => {
                if (num >= 1 && num <= 45) {
                    freq[num]++;
                }
            });
        }
    });

    // 4. 번호와 빈도를 객체 배열로 정렬[cite: 15]
    const numFreqList = [];
    for (let i = 1; i <= 45; i++) {
        numFreqList.push({ num: i, count: freq[i] });
    }

    // 출현 빈도 기준 내림차순 정렬 (자주 나온 순)[cite: 15]
    numFreqList.sort((a, b) => b.count - a.count);

    // 5. 정밀 통계 조합 추출[cite: 15]
    const top6 = numFreqList.slice(0, 6).map(item => item.num).sort((a, b) => a - b);
    const bottom6 = numFreqList.slice(-6).map(item => item.num).sort((a, b) => a - b);
    const balanced6 = [
        numFreqList[0].num, numFreqList[2].num, numFreqList[4].num,
        numFreqList[6].num, numFreqList[8].num, numFreqList[10].num
    ].sort((a, b) => a - b);

    const statSets = [top6, bottom6, balanced6];
    const title = `📊 [${selectedRound}회차 기준] 정밀 통계 분석 추천 세트`;

    // 6. 화면 출력 및 [종합 보내기] 버튼 포함 렌더링 처리[cite: 15]
    renderStatWithBasketView(title, statSets);

    // [중요] 통계 분석 모듈 완료 상태 체크 실행[cite: 15]
    markAnalysisComplete('statistics');
}

// [종합 보내기] 버튼이 포함된 통계 분석 결과 뷰어 렌더러[cite: 15]
function renderStatWithBasketView(title, sets) {
    const recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    let html = `
        <div class="recommend-card" style="padding: 25px;">
            <div class="recommend-header" style="margin-bottom: 20px;"><span style="font-size: 1.15rem; font-weight: 800;">${title}</span></div>
            <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 15px;">
    `;

    const setNames = ["최다출현(TOP6)", "최소출현(BOTTOM6)", "균형조합(BALANCED)"];

    sets.forEach((set, idx) => {
        const setStr = set.join(",");
        const resultSpanId = `check-result-stat-${idx}`;
        const containerId = `ball-container-stat-${idx}`;
        const ballsHtml = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");
        const currentSetName = setNames[idx] || `세트 ${idx + 1}`;

        html += `
            <div class="recommend-row" style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.35); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px;">
                <span class="set-tag" style="color: #38bdf8; font-weight: 700; min-width: 140px;">[${currentSetName}]</span>
                <div id="${containerId}" class="lotto-ball-wrapper" style="display: flex; gap: 10px; align-items: center;">${ballsHtml}</div>
                <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                    <!-- [종합 보내기 버튼 추가] -->
                    <button class="btn-inline-check" style="background: #0284c7; color: white; padding: 8px 14px;" onclick="sendToComprehensiveBasket('${currentSetName}', '${setStr}', '통계분석')">종합 보내기</button>
                    <button class="btn-inline-check" style="padding: 8px 14px;" onclick="checkWinForNumbers('${setStr}', '${resultSpanId}', '${containerId}')">당첨 확인</button>
                    <span id="${resultSpanId}" class="result-text" style="font-size: 0.9rem;"></span>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    recommendDiv.innerHTML = html;
}

// 분석 완료 상태 등록[cite: 15]
markAnalysisComplete('statistics');