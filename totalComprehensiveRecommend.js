/**
 * [종합 예상 결과 및 바스켓 관리 모듈]
 * - 바스켓 조합 간 공통 출현 숫자 상단 표시
 * - 크리티컬 AI 핵심 번호(강화AI/LSTM TOP10 및 공통핵심) 기반 '강력한 조합 세트 10개'를 최상단에 배치
 * - 개별 결과와 동일한 로또 공 디자인 및 당첨 확인 기능 연동
 */

// 전역 바스켓 저장소
window.comprehensiveBasket = [];

// 특정 세트를 종합 바스켓에 담는 함수
function sendToComprehensiveBasket(setName, numbersStr, sourceModule) {
    const nums = numbersStr.split(",").map(Number);
    
    const exists = window.comprehensiveBasket.some(item => item.numbers.join(",") === nums.join(","));
    if (exists) {
        alert(`이미 종합 예상 결과에 담긴 조합입니다! (${setName})`);
        return;
    }

    window.comprehensiveBasket.push({
        name: `${sourceModule} - ${setName}`,
        numbers: nums,
        module: sourceModule,
        setName: setName
    });

    alert(`🌟 [${sourceModule}]의 [${setName}] 조합이 종합 예상 결과 바스켓에 담겼습니다!`);
}

// 6개 분석 모듈 완료 체크 관리
if (typeof window.analysisStatus === "undefined") {
    window.analysisStatus = {
        hot: false,
        cold: false,
        trend: false,
        statistics: false,
        enhancedAiRecommend: false,
        lstm: false
    };
}

function markAnalysisComplete(moduleKey) {
    if (moduleKey === 'enhancedAi') {
        moduleKey = 'enhancedAiRecommend';
    }

    if (window.analysisStatus && Object.prototype.hasOwnProperty.call(window.analysisStatus, moduleKey)) {
        window.analysisStatus[moduleKey] = true;
    }

    const allDone = Object.values(window.analysisStatus).every(status => status === true);

    if (allDone) {
        const totalBtn = document.getElementById("totalBtn");
        if (totalBtn) {
            totalBtn.disabled = false;
            totalBtn.style.background = "linear-gradient(135deg, #6366f1, #a855f7)";
            totalBtn.style.opacity = "1";
            totalBtn.style.cursor = "pointer";
            totalBtn.textContent = "🌟 종합 예상 결과 (베스트 10 & 담은 조합 보기)";
        }
    }
}

// 종합 예상 결과 실행 함수
async function totalComprehensiveRecommend() {
    const allDone = Object.values(window.analysisStatus).every(status => status === true);
    if (!allDone) {
        alert("아직 모든 분석 버튼을 누르지 않았습니다. 6가지 분석을 모두 실행한 후 눌러주세요!");
        return;
    }

    try {
        if (typeof lottoData === "undefined" || !lottoData || lottoData.length === 0) {
            alert("로또 데이터가 없습니다.");
            return;
        }

        const roundSelect = document.getElementById("roundSelect");
        if (!roundSelect) return;
        const selectedRound = Number(roundSelect.value);

        const recommendDiv = document.getElementById("recommend");
        if (recommendDiv) {
            recommendDiv.innerHTML = `
                <div class="recommend-card" style="text-align: center; padding: 45px;">
                    <div style="font-size: 2.2rem; margin-bottom: 12px;">🌟</div>
                    <h3 style="color: #a855f7; margin: 0 0 10px 0; font-size: 1.2rem;">크리티컬 AI 기반 강력한 조합 세트 생성 중...</h3>
                </div>
            `;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        // 1. 크리티컬 항목들(TOP10 & 공통핵심) 전용 가중치 배열 산출
        const criticalWeights = new Array(46).fill(1);
        const criticalItems = window.comprehensiveBasket.filter(item => 
            item.setName && (item.setName.includes("TOP10번호") || item.setName.includes("공통핵심번호"))
        );

        // 크리티컬 번호들에 높은 가중치 부여 (중복 포함하여 가중치 누적)
        criticalItems.forEach(item => {
            if (Array.isArray(item.numbers)) {
                item.numbers.forEach(num => {
                    if (num >= 1 && num <= 45) {
                        criticalWeights[num] += 5; // 크리티컬 가중치 대폭 상향
                    }
                });
            }
        });

        // 2. 전체 바스켓 빈도 계산 (일반 베스트 10 및 공통 번호용)
        const basketFreq = new Array(46).fill(0);
        window.comprehensiveBasket.forEach(item => {
            if (Array.isArray(item.numbers)) {
                item.numbers.forEach(num => {
                    if (num >= 1 && num <= 45) {
                        basketFreq[num]++;
                    }
                });
            }
        });

        const commonList = [];
        for (let i = 1; i <= 45; i++) {
            if (basketFreq[i] > 0) {
                commonList.push({ num: i, count: basketFreq[i] });
            }
        }
        commonList.sort((a, b) => b.count - a.count || a.num - b.num);
        const topCommonNumbers = commonList.slice(0, 8);

        // 3. [신규 핵심] 크리티컬 가중치 기반 '가장 강력한 조합 세트 10개' 생성
        const criticalPowerfulSets = [];
        let critAttempts = 0;
        while (criticalPowerfulSets.length < 10 && critAttempts < 20000) {
            critAttempts++;
            const candidate = generateWeightedBasketNumbers(criticalWeights);
            
            const sum = candidate.reduce((a, b) => a + b, 0);
            const oddCount = candidate.filter(n => n % 2 !== 0).length;

            if (sum >= 100 && sum <= 175 && oddCount >= 2 && oddCount <= 4) {
                const setStr = candidate.join(",");
                if (!criticalPowerfulSets.some(s => s.join(",") === setStr)) {
                    criticalPowerfulSets.push(candidate);
                }
            }
        }
        while (criticalPowerfulSets.length < 10) {
            const candidate = generateWeightedBasketNumbers(criticalWeights);
            const setStr = candidate.join(",");
            if (!criticalPowerfulSets.some(s => s.join(",") === setStr)) {
                criticalPowerfulSets.push(candidate);
            }
        }

        // 4. 일반 바스켓 가중치 반영 베스트 10 세트 생성
        const weights = new Array(46).fill(1);
        for (let i = 1; i <= 45; i++) {
            weights[i] += basketFreq[i] * 3;
        }

        const bestSets = [];
        let attempts = 0;
        while (bestSets.length < 10 && attempts < 15000) {
            attempts++;
            const candidate = generateWeightedBasketNumbers(weights);
            
            const sum = candidate.reduce((a, b) => a + b, 0);
            const oddCount = candidate.filter(n => n % 2 !== 0).length;

            if (sum >= 100 && sum <= 175 && oddCount >= 2 && oddCount <= 4) {
                const setStr = candidate.join(",");
                if (!bestSets.some(s => s.join(",") === setStr)) {
                    bestSets.push(candidate);
                }
            }
        }
        while (bestSets.length < 10) {
            const candidate = generateWeightedBasketNumbers(weights);
            const setStr = candidate.join(",");
            if (!bestSets.some(s => s.join(",") === setStr)) {
                bestSets.push(candidate);
            }
        }

        // 5. 화면 렌더링 구축
        let html = `
            <div class="recommend-card" style="padding: 25px;">
                <div class="recommend-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <span style="color: #a855f7; font-weight: 800; font-size: 1.15rem;">🌟 [${selectedRound}회차] 종합 예상 결과 대시보드</span>
                    <span style="font-size: 0.85rem; background: rgba(168, 85, 247, 0.15); color: #a855f7; padding: 6px 14px; border-radius: 12px; font-weight: 600;">
                        바스켓 연동 완료
                    </span>
                </div>
        `;

        // [파트 1] 가장 상단 배치: 크리티컬 AI 핵심 번호 기반 '강력한 조합 세트 10개'
        html += `
            <div style="margin-bottom: 30px; padding: 24px; background: rgba(239, 68, 68, 0.06); border: 1.5px solid rgba(239, 68, 68, 0.45); border-radius: 18px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <span style="font-size: 1.3rem;">🔥</span>
                    <h4 style="margin: 0; color: #ef4444; font-size: 1.15rem; font-weight: 800;">
                        크리티컬 AI 핵심 번호 기반 강력한 추천 세트 10개
                    </h4>
                </div>
                <p style="color: #94a3b8; font-size: 0.9rem; margin: 0 0 20px 0; line-height: 1.4;">
                    강화AI 및 LSTM의 TOP10 및 공통핵심 번호들의 가중치를 최우선으로 반영하여 조합한 가장 강력한 추천 세트입니다.
                </p>
                <div style="display: flex; flex-direction: column; gap: 14px;">
        `;

        criticalPowerfulSets.forEach((set, idx) => {
            const prefix = `[크리티컬 강력세트 ${idx + 1}]`;
            const setStr = set.join(",");
            const resultSpanId = `crit-powerful-res-${idx}`;
            const containerId = `crit-powerful-cont-${idx}`;
            const ballsHtml = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

            html += `
                <div class="recommend-row" style="background: rgba(15, 23, 42, 0.85); border-color: rgba(239, 68, 68, 0.4); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <span class="set-tag" style="color: #ef4444; font-size: 0.9rem; font-weight: 700; min-width: 140px;">${prefix}</span>
                    <div id="${containerId}" class="lotto-ball-wrapper" style="display: flex; gap: 10px; align-items: center;">${ballsHtml}</div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                        <button class="btn-inline-check" style="padding: 8px 14px;" onclick="checkWinForNumbers('${setStr}', '${resultSpanId}', '${containerId}')">당첨 확인</button>
                        <span id="${resultSpanId}" class="result-text" style="font-size: 0.9rem;"></span>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;

        // [파트 2] 공통 출현 핵심 숫자 표시
        const commonBallsHtml = topCommonNumbers.length > 0
            ? topCommonNumbers.map(item => `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 6px;">
                    ${typeof createLottoBallHtml === 'function' ? createLottoBallHtml(item.num) : `<span class="lotto-ball" style="padding: 8px 12px; font-size: 1rem;">${item.num}</span>`}
                    <span style="font-size: 0.8rem; color: #c084fc; font-weight: 700; background: rgba(168, 85, 247, 0.12); padding: 3px 8px; border-radius: 6px;">${item.count}개 세트 포함</span>
                </div>
            `).join("")
            : `<p style="color: #94a3b8; font-size: 0.9rem; margin: 0; text-align: center; padding: 10px;">바스켓에 담긴 조합이 없어 공통 번호를 집계할 수 없습니다.</p>`;

        html += `
            <div style="padding: 24px; background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 18px; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <span style="font-size: 1.3rem;">💎</span>
                    <h4 style="margin: 0; color: #c084fc; font-size: 1.1rem; font-weight: 800;">
                        내가 담은 바스켓 조합 간 공통 발견 핵심 숫자
                    </h4>
                </div>
                <p style="color: #94a3b8; font-size: 0.9rem; margin: 0 0 20px 0; line-height: 1.4;">
                    바스켓에 담아둔 여러 분석 결과 세트 내부에서 가장 빈번하게 중복 등장하는 핵심 공통 번호입니다.
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-items: center; padding: 10px 0;">
                    ${commonBallsHtml}
                </div>
            </div>
        `;

        // [파트 3] 원본 크리티컬 항목들 및 일반 세트 조합 모음
        if (criticalItems.length > 0) {
            html += `
                <div style="margin-bottom: 30px; padding: 24px; background: rgba(239, 68, 68, 0.03); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 18px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <span style="font-size: 1.3rem;">🎯</span>
                        <h4 style="margin: 0; color: #ef4444; font-size: 1.1rem; font-weight: 800;">
                            담아온 크리티컬 AI 핵심 번호 원본 목록 (${criticalItems.length}개)
                        </h4>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 14px;">
            `;
            criticalItems.forEach((item, idx) => {
                const setStr = item.numbers.join(",");
                const rId = `crit-orig-res-${idx}`;
                const cId = `crit-orig-cont-${idx}`;
                const ballsHtml = item.numbers.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

                html += `
                    <div class="recommend-row" style="background: rgba(15, 23, 42, 0.75); border-color: rgba(239, 68, 68, 0.3); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <span class="set-tag" style="color: #ef4444; font-size: 0.9rem; font-weight: 700; min-width: 180px;">[${item.name}]</span>
                        <div id="${cId}" class="lotto-ball-wrapper" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">${ballsHtml}</div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                            <button class="btn-inline-check" style="padding: 8px 14px;" onclick="checkWinForNumbers('${setStr}', '${rId}', '${cId}')">당첨 확인</button>
                            <span id="${rId}" class="result-text" style="font-size: 0.9rem;"></span>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        // 일반 세트 조합 모음
        const normalBasketItems = window.comprehensiveBasket.filter(item => 
            !(item.setName && (item.setName.includes("TOP10번호") || item.setName.includes("공통핵심번호")))
        );

        html += `
            <div style="margin-bottom: 30px; padding: 24px; background: rgba(56, 189, 248, 0.04); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 18px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <span style="font-size: 1.3rem;">📥</span>
                    <h4 style="margin: 0; color: #38bdf8; font-size: 1.1rem; font-weight: 800;">
                        일반 분석 세트 조합 모음 (${normalBasketItems.length}개)
                    </h4>
                </div>
        `;

        if (normalBasketItems.length === 0) {
            html += `<p style="color: #94a3b8; font-size: 0.9rem; margin: 0; padding: 10px 0;">일반 모듈에서 담은 조합이 없습니다.</p>`;
        } else {
            html += `<div style="display: flex; flex-direction: column; gap: 14px; margin-top: 15px;">`;
            normalBasketItems.forEach((item, idx) => {
                const setStr = item.numbers.join(",");
                const rId = `basket-res-${idx}`;
                const cId = `basket-cont-${idx}`;
                const ballsHtml = item.numbers.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

                html += `
                    <div class="recommend-row" style="background: rgba(15, 23, 42, 0.75); border-color: rgba(56, 189, 248, 0.35); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <span class="set-tag" style="color: #38bdf8; font-size: 0.9rem; font-weight: 700; min-width: 140px;">[${item.name}]</span>
                        <div id="${cId}" class="lotto-ball-wrapper" style="display: flex; gap: 10px; align-items: center;">${ballsHtml}</div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                            <button class="btn-inline-check" style="padding: 8px 14px;" onclick="checkWinForNumbers('${setStr}', '${rId}', '${cId}')">당첨 확인</button>
                            <span id="${rId}" class="result-text" style="font-size: 0.9rem;"></span>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }
        html += `</div>`;

        // [파트 4] 바스켓 기반 최종 베스트 10 세트 출력
        html += `
            <div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                    <span style="font-size: 1.3rem;">🏆</span>
                    <h4 style="margin: 0; color: #c084fc; font-size: 1.15rem; font-weight: 800;">
                        바스켓 기반 당첨 근접 최종 베스트 10 추천 세트
                    </h4>
                </div>
                <div style="display: flex; flex-direction: column; gap: 14px;">
        `;

        bestSets.forEach((set, idx) => {
            const prefix = `[베스트 세트 ${idx + 1}]`;
            const setStr = set.join(",");
            const resultSpanId = `check-result-comprehensive-${idx}`;
            const containerId = `ball-container-comprehensive-${idx}`;
            const ballsHtml = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

            html += `
                <div class="recommend-row" style="background: rgba(168, 85, 247, 0.05); border-color: rgba(168, 85, 247, 0.35); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <span class="set-tag" style="color: #c084fc; font-size: 0.9rem; font-weight: 700; min-width: 100px;">${prefix}</span>
                    <div id="${containerId}" class="lotto-ball-wrapper" style="display: flex; gap: 10px; align-items: center;">${ballsHtml}</div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                        <button class="btn-inline-check" style="padding: 8px 14px;" onclick="checkWinForNumbers('${setStr}', '${resultSpanId}', '${containerId}')">당첨 확인</button>
                        <span id="${resultSpanId}" class="result-text" style="font-size: 0.9rem;"></span>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        recommendDiv.innerHTML = html;

    } catch (err) {
        console.error("종합 결과 생성 중 오류 발생:", err);
        alert("실행 중 오류가 발생했습니다.");
    }
}

// 바스켓 가중치 기반 번호 추출 헬퍼 함수
function generateWeightedBasketNumbers(weights) {
    const numbers = [];
    const available = Array.from({ length: 45 }, (_, i) => i + 1);
    const currentWeights = [...weights];

    while (numbers.length < 6) {
        let totalWeight = 0;
        for (let num of available) {
            totalWeight += currentWeights[num];
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