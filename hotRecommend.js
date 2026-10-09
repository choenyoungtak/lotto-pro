/**
 * [HOT 추천 모듈]
 * 누적 통계 기반 가중치 추출 방식으로 5세트를 생성하고,
 * 세트 간 공통 출현 번호를 집계하여 화면에 함께 렌더링합니다.
 */

function hotRecommend() {
    if (typeof lottoData === "undefined" || !lottoData || lottoData.length === 0) {
        alert("로또 데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        return;
    }

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

    // 선택한 회차 이하(N회차 포함 및 이전 회차) 데이터만 필터링
    const filteredData = lottoData.filter(draw => {
        const round = Number(draw["회차"] || draw.round);
        return !isNaN(round) && round <= selectedRound;
    });

    if (filteredData.length === 0) {
        alert(`선택한 [${selectedRound}회차] 이전 데이터가 없습니다.`);
        return;
    }

    // 해당 회차까지의 누적 출현 빈도(Hot Number) 계산
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

    // 출현 빈도를 가중치로 설정
    const weights = new Array(46).fill(0);
    for (let i = 1; i <= 45; i++) {
        weights[i] = freq[i] + 1;
    }

    // 가중치 기반 HOT 추천 5세트 생성
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

    // 생성된 HOT 세트들 간 공통 출현 번호 집계 (2회 이상 겹친 번호)
    const commonOverlapNumbers = extractHotCommonOverlapNumbers(sets);

    // 화면 출력 처리: 기존 showRecommend 함수가 있다면 활용하되, 공통 번호 영역을 DOM에 강제로 추가 주입
    const title = `🔥 [${selectedRound}회차 누적 통계 기준] HOT 추천 (5세트)`;
    
    if (typeof showRecommend === "function") {
        showRecommend(title, sets);
    } else {
        // showRecommend가 없을 경우를 대비한 기본 렌더링 뷰어
        renderDefaultHotView(title, sets);
    }

    // 화면에 공통 출현 번호를 별도로 시각화해서 뿌려주는 함수 실행
    renderHotCommonOverlapUI(commonOverlapNumbers);
}

// 가중치 기반 무작위 추출 함수
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

// 생성된 HOT 세트들 내부에서 공통으로 가장 많이 겹쳐서 나온 숫자 집계 함수
function extractHotCommonOverlapNumbers(sets) {
    if (!sets || sets.length === 0) return [];

    const freq = new Array(46).fill(0);
    sets.forEach(set => {
        set.forEach(num => {
            if (num >= 1 && num <= 45) {
                freq[num]++;
            }
        });
    });

    const list = [];
    for (let i = 1; i <= 45; i++) {
        // 2개 이상의 세트에서 공통으로 등장한 번호 추출
        if (freq[i] >= 2) {
            list.push({ num: i, count: freq[i] });
        }
    }
    
    // 많이 겹친 순서(count 내림차순) 및 번호 오름차순 정렬
    list.sort((a, b) => b.count - a.count || a.num - b.num);
    return list;
}

// 화면 상단 또는 결과 영역에 공통 출현 번호를 주입하는 UI 렌더러
function renderHotCommonOverlapUI(commonOverlapNumbers) {
    let recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    // 공통 번호 볼 HTML 생성
    const commonBallsHtml = commonOverlapNumbers.length > 0 
        ? commonOverlapNumbers.map(item => `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                ${typeof createLottoBallHtml === 'function' ? createLottoBallHtml(item.num) : `<span class="lotto-ball">${item.num}</span>`}
                <span style="font-size: 0.75rem; color: #f59e0b; font-weight: 600;">${item.count}개 세트 공통</span>
            </div>
        `).join("")
        : `<p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">이번 추천 세트 간에 2회 이상 겹치는 공통 번호가 없습니다.</p>`;

    // 기존 결과 카드 상단이나 하단에 공통 번호 박스를 동적으로 삽입
    const overlapBoxHtml = `
        <div style="padding: 20px; background: rgba(245, 158, 11, 0.05); border: 1px solid #f59e0b; border-radius: 16px; margin-top: 15px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <span style="font-size: 1.2rem;">💎</span>
                <h4 style="margin: 0; color: #f59e0b; font-size: 1.05rem; font-weight: 800;">
                    HOT 추천 세트 간 공통 출현 핵심 번호
                </h4>
            </div>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 0 0 15px 0;">
                생성된 5개의 추천 세트 내부에서 가장 빈번하게 중복 겹쳐서 등장하는 공통 번호입니다.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; align-items: center; padding: 10px 0;">
                ${commonBallsHtml}
            </div>
        </div>
    `;

    // recommendDiv 내부의 가장 첫 번째 카드 상단에 해당 HTML 삽입
    const firstCard = recommendDiv.querySelector(".recommend-card");
    if (firstCard) {
        firstCard.insertAdjacentHTML('afterbegin', overlapBoxHtml);
    } else {
        recommendDiv.innerHTML += overlapBoxHtml;
    }
}

// 기본 뷰어 (showRecommend가 없을 때 대비)
function renderDefaultHotView(title, sets) {
    const recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    let html = `
        <div class="recommend-card">
            <div class="recommend-header"><span>${title}</span></div>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
    `;

    sets.forEach((set, idx) => {
        const setStr = set.join(",");
        const resultSpanId = `check-result-hot-${idx}`;
        const containerId = `ball-container-hot-${idx}`;
        const ballsHtml = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

        html += `
            <div class="recommend-row">
                <span class="set-tag" style="color: #f59e0b;">[세트 ${idx + 1}]</span>
                <div id="${containerId}" class="lotto-ball-wrapper">${ballsHtml}</div>
                <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
                    <button class="btn-inline-check" onclick="checkWinForNumbers('${setStr}', '${resultSpanId}', '${containerId}')">당첨 확인</button>
                    <span id="${resultSpanId}" class="result-text"></span>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    recommendDiv.innerHTML = html;
}