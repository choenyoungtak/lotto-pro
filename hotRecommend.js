/**
 * [HOT 추천 모듈 - 통계 가중치 강화 버전]
 * 누적 통계 빈도가 높은 상위 번호들에 강력한 가중치를 부여하여
 * 실제로 많이 나온 번호 위주로 5세트를 정밀하게 생성합니다.
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

    // 선택한 회차 이하(N회차 포함 및 이전 회차) 데이터만 필터링[cite: 15]
    const filteredData = lottoData.filter(draw => {
        const round = Number(draw["회차"] || draw.round);
        return !isNaN(round) && round <= selectedRound;
    });

    if (filteredData.length === 0) {
        alert(`선택한 [${selectedRound}회차] 이전 데이터가 없습니다.`);
        return;
    }

    // 해당 회차까지의 누적 출현 빈도(Hot Number) 계산[cite: 15]
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

    // [개선 포인트] 빈도에 비례한 가중치를 훨씬 강력하게 부여 (많이 나온 번호가 압도적으로 자주 뽑히도록 설정)
    const weights = new Array(46).fill(1);
    const maxFreq = Math.max(...freq.slice(1)) || 1;
    for (let i = 1; i <= 45; i++) {
        // 출현 횟수가 많을수록 가중치 점수를 제곱에 가깝게 높여 빈도수 차이를 극대화함
        weights[i] = Math.pow(freq[i], 1.8) + 1;
    }

    // 강화된 가중치 기반 HOT 추천 5세트 생성
    const sets = [];
    let attempts = 0;

    while (sets.length < 5 && attempts < 2000) {
        attempts++;
        const selected = generateWeightedNumbers(weights);

        const setStr = selected.join(",");
        if (!sets.some(s => s.join(",") === setStr)) {
            sets.push(selected);
        }
    }

    // 생성된 HOT 세트들 간 공통 출현 번호 집계[cite: 15]
    const commonOverlapNumbers = extractHotCommonOverlapNumbers(sets);

    // 화면 출력 처리[cite: 15]
    const title = `🔥 [${selectedRound}회차 누적 통계 기준] HOT 추천 (통계 반영 5세트)`;
    
    if (typeof showRecommend === "function") {
        showRecommend(title, sets);
        injectHotBasketButtons();
    } else {
        renderDefaultHotView(title, sets);
    }

    renderHotCommonOverlapUI(commonOverlapNumbers);

    if (typeof markAnalysisComplete === "function") {
        markAnalysisComplete('hot');
    }
}

// 가중치 기반 무작위 추출 함수[cite: 15]
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

// 생성된 HOT 세트들 내부에서 공통으로 가장 많이 겹쳐서 나온 숫자 집계 함수[cite: 15]
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
        if (freq[i] >= 2) {
            list.push({ num: i, count: freq[i] });
        }
    }
    
    list.sort((a, b) => b.count - a.count || a.num - b.num);
    return list;
}

// 화면 상단 또는 결과 영역에 공통 출현 번호를 주입하는 UI 렌더러[cite: 15]
function renderHotCommonOverlapUI(commonOverlapNumbers) {
    let recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    const commonBallsHtml = commonOverlapNumbers.length > 0 
        ? commonOverlapNumbers.map(item => `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 4px;">
                ${typeof createLottoBallHtml === 'function' ? createLottoBallHtml(item.num) : `<span class="lotto-ball">${item.num}</span>`}
                <span style="font-size: 0.8rem; color: #f59e0b; font-weight: 700; background: rgba(245, 158, 11, 0.12); padding: 3px 8px; border-radius: 6px;">${item.count}개 세트 공통</span>
            </div>
        `).join("")
        : `<p style="color: #94a3b8; font-size: 0.9rem; margin: 0; text-align: center; padding: 10px;">이번 추천 세트 간에 2회 이상 겹치는 공통 번호가 없습니다.</p>`;

    const overlapBoxHtml = `
        <div style="padding: 24px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 18px; margin-top: 15px; margin-bottom: 25px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <span style="font-size: 1.3rem;">💎</span>
                <h4 style="margin: 0; color: #f59e0b; font-size: 1.1rem; font-weight: 800;">
                    HOT 추천 세트 간 공통 출현 핵심 번호
                </h4>
            </div>
            <p style="color: #94a3b8; font-size: 0.9rem; margin: 0 0 20px 0; line-height: 1.4;">
                생성된 5개의 추천 세트 내부에서 가장 빈번하게 중복 겹쳐서 등장하는 공통 번호입니다.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-items: center; padding: 10px 0;">
                ${commonBallsHtml}
            </div>
        </div>
    `;

    const firstCard = recommendDiv.querySelector(".recommend-card");
    if (firstCard) {
        firstCard.insertAdjacentHTML('afterbegin', overlapBoxHtml);
    } else {
        recommendDiv.innerHTML += overlapBoxHtml;
    }
}

// 기본 뷰어[cite: 15]
function renderDefaultHotView(title, sets) {
    const recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    let html = `
        <div class="recommend-card" style="padding: 25px;">
            <div class="recommend-header" style="margin-bottom: 20px;"><span style="font-size: 1.15rem; font-weight: 800;">${title}</span></div>
            <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 15px;">
    `;

    sets.forEach((set, idx) => {
        const setStr = set.join(",");
        const resultSpanId = `check-result-hot-${idx}`;
        const containerId = `ball-container-hot-${idx}`;
        const ballsHtml = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

        html += `
            <div class="recommend-row" style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(245, 158, 11, 0.35); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px;">
                <span class="set-tag" style="color: #f59e0b; font-weight: 700; min-width: 90px;">[세트 ${idx + 1}]</span>
                <div id="${containerId}" class="lotto-ball-wrapper" style="display: flex; gap: 10px; align-items: center;">${ballsHtml}</div>
                <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                    <button class="btn-inline-check" style="background: #0284c7; color: white; padding: 8px 14px;" onclick="sendToComprehensiveBasket('HOT세트 ${idx + 1}', '${setStr}', 'HOT추천')">종합 보내기</button>
                    <button class="btn-inline-check" style="padding: 8px 14px;" onclick="checkWinForNumbers('${setStr}', '${resultSpanId}', '${containerId}')">당첨 확인</button>
                    <span id="${resultSpanId}" class="result-text" style="font-size: 0.9rem;"></span>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    recommendDiv.innerHTML = html;
}

// 후처리 헬퍼 함수[cite: 15]
function injectHotBasketButtons() {
    const rows = document.querySelectorAll("#recommend .recommend-row");
    rows.forEach((row, idx) => {
        if (row.querySelector(".btn-basket-injected")) return;

        // 행 레이아웃 스타일 적용
        row.style.cssText = "background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(245, 158, 11, 0.35); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 12px;";

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
                        sendToComprehensiveBasket(`HOT ${setTag}`, numbers, 'HOT추천');
                    };
                    checkBtn.parentNode.insertBefore(basketBtn, checkBtn);
                }
            }
        }
    });
}