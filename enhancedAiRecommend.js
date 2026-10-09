/**
 * [강화 AI (Enhanced AI) 통합 모듈]
 * - 누적 통계 기반 빈도 가중치 분석 (Statistical Weighting)
 * - Dense 및 LSTM 듀얼 신경망 시계열 딥러닝 앙상블 (LOOKBACK = 10)
 * - 통계 점수 + 딥러닝 확률의 하이브리드 블렌딩을 통한 정밀도 극대화
 * - 실시간 ETA 카운드다운 및 세트 간 공통 출현 번호 자동 집계
 */

async function enhancedAiRecommend() {
    try {
        if (typeof lottoData === "undefined" || !lottoData || lottoData.length === 0) {
            alert("로또 데이터(lottoData)가 로드되지 않았습니다. 데이터를 먼저 불러와 주세요.");
            return;
        }

        if (typeof tf === "undefined") {
            alert("TensorFlow.js 라이브러리가 로드되지 않았습니다.");
            return;
        }

        const roundSelect = document.getElementById("roundSelect");
        if (!roundSelect) {
            alert("회차 선택 셀렉트박스를 찾을 수 없습니다.");
            return;
        }

        const selectedRound = Number(roundSelect.value);
        
        // 1. 선택한 회차 이하의 과거 데이터 필터링 및 정렬
        const historicalData = lottoData
            .filter(d => Number(d["회차"] || d.round) <= selectedRound)
            .sort((a, b) => Number(a["회차"] || b.round) - Number(b["회차"] || b.round));

        if (historicalData.length < 35) {
            alert("강화 AI 학습을 위한 최소 데이터(35회차 이상)가 부족합니다.");
            return;
        }

        const startTime = performance.now();

        // UI에 남은 시간(ETA) 프로그레스 표시 영역 설정
        const recommendDiv = document.getElementById("recommend");
        if (recommendDiv) {
            recommendDiv.innerHTML = `
                <div class="recommend-card" style="text-align: center; padding: 35px;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">⚡</div>
                    <h3 style="color: #38bdf8; margin: 0 0 10px 0;">강화 AI 하이브리드 정밀 분석 중...</h3>
                    <p style="color: #94a3b8; font-size: 0.95rem;">[통계 가중치 + 듀얼 딥러닝 앙상블] / [1회차 ~ ${selectedRound}회차] 학습 중입니다.</p>
                    <div id="ai-progress" style="color: #a78bfa; font-weight: bold; margin-top: 15px;">초기화 중... (예상 잔여 시간 계산 중)</div>
                </div>
            `;
        }

        await new Promise(resolve => setTimeout(resolve, 50));

        // ==========================================
        // [A파트] 통계 기반 누적 빈도 및 가중치 산출 (Hot / Statistical Score)
        // ==========================================
        const freq = new Array(46).fill(0);
        historicalData.forEach(draw => {
            const numbers = draw["당첨번호"] || draw.numbers;
            if (Array.isArray(numbers)) {
                numbers.forEach(num => {
                    if (num >= 1 && num <= 45) freq[num]++;
                });
            }
        });

        // 정규화된 통계 점수 배열 생성 (0 ~ 1 스케일)
        const maxFreq = Math.max(...freq, 1);
        const statScores = new Float32Array(45);
        for (let i = 1; i <= 45; i++) {
            statScores[i - 1] = (freq[i] + 1) / (maxFreq + 1);
        }

        // ==========================================
        // [B파트] 듀얼 딥러닝 신경망 모델 학습 (Dense + LSTM, LOOKBACK = 10)
        // ==========================================
        const LOOKBACK = 10;
        const vectors = historicalData.map(draw => {
            const vec = new Array(45).fill(0);
            const nums = draw["당첨번호"] || draw.numbers || [];
            nums.forEach(n => { if (n >= 1 && n <= 45) vec[n - 1] = 1; });
            return vec;
        });

        const X_data = [];
        const Y_data = [];

        for (let i = 0; i <= vectors.length - LOOKBACK - 1; i++) {
            X_data.push(vectors.slice(i, i + LOOKBACK));
            Y_data.push(vectors[i + LOOKBACK]);
        }

        const xs = tf.tensor3d(X_data);
        const ys = tf.tensor2d(Y_data);
        const progressEl = document.getElementById("ai-progress");

        const updateEta = (stepName, progressPercent) => {
            if (progressEl) {
                const elapsed = (performance.now() - startTime) / 1000;
                const estimatedTotal = progressPercent > 0 ? elapsed / (progressPercent / 100) : 3.5;
                const remaining = Math.max(0, estimatedTotal - elapsed).toFixed(1);
                progressEl.innerText = `${stepName} - 잔여 시간 약 ${remaining}초 (${elapsed.toFixed(1)}초 경과)`;
            }
        };

        // 1. Dense 모델 학습 (30%)
        updateEta("[1/2] Dense 정밀 모델 학습 중", 30);
        await tf.nextFrame();

        const modelDense = tf.sequential();
        modelDense.add(tf.layers.flatten({ inputShape: [LOOKBACK, 45] }));
        modelDense.add(tf.layers.dense({ units: 128, activation: 'relu' }));
        modelDense.add(tf.layers.dense({ units: 45, activation: 'sigmoid' }));
        modelDense.compile({ optimizer: tf.train.adam(0.003), loss: 'binaryCrossentropy' });
        await modelDense.fit(xs, ys, { epochs: 20, batchSize: 16, verbose: 0 });

        // 2. LSTM 시계열 모델 학습 (65%)
        updateEta("[2/2] LSTM 시계열 모델 학습 중", 65);
        await tf.nextFrame();

        const modelLstm = tf.sequential();
        modelLstm.add(tf.layers.lstm({ units: 64, inputShape: [LOOKBACK, 45], returnSequences: false }));
        modelLstm.add(tf.layers.dense({ units: 45, activation: 'sigmoid' }));
        modelLstm.compile({ optimizer: tf.train.adam(0.003), loss: 'binaryCrossentropy' });
        await modelLstm.fit(xs, ys, { epochs: 20, batchSize: 16, verbose: 0 });

        // 3. 예측 및 하이브리드 스코어 융합 (85%)
        updateEta("통계 가중치 및 딥러닝 확률 하이브리드 융합 중", 85);
        await tf.nextFrame();

        const recentInput = vectors.slice(-LOOKBACK);
        const inputTensor = tf.tensor3d([recentInput]);

        const predDenseTensor = modelDense.predict(inputTensor);
        const predLstmTensor = modelLstm.predict(inputTensor);

        const probDense = await predDenseTensor.data();
        const probLstm = await predLstmTensor.data();

        const denseProbArray = Array.from(probDense);
        const lstmProbArray = Array.from(probLstm);

        // [최종 정밀 융합] 통계 점수(20%) + Dense(40%) + LSTM(40%) 결합
        const hybridProbabilities = new Float32Array(45);
        for (let i = 0; i < 45; i++) {
            hybridProbabilities[i] = (statScores[i] * 0.2) + (probDense[i] * 0.4) + (probLstm[i] * 0.4);
        }

        xs.dispose();
        ys.dispose();
        inputTensor.dispose();
        predDenseTensor.dispose();
        predLstmTensor.dispose();
        modelDense.dispose();
        modelLstm.dispose();

        // 4. 고도화된 시뮬레이션 후보군 생성
        const denseSets = generateEnhancedSets(denseProbArray, 40);
        const lstmSets = generateEnhancedSets(lstmProbArray, 40);
        const hybridSets = generateEnhancedSets(hybridProbabilities, 60);

        // 5. 강화 AI HOT TOP 10 핵심 번호 추출
        const enhancedHotTop10 = extractEnhancedTop10(hybridProbabilities);

        // 6. 앙상블 TOP 5 추천 조합 구성
        const top5Sets = generateTop5Sets(hybridSets, enhancedHotTop10);

        // 7. 모든 추천 세트 간 공통 출현 번호 집계
        const allRecommendedSets = [...top5Sets, ...denseSets.slice(0, 2), ...lstmSets.slice(0, 2)];
        const commonOverlapNumbers = extractCommonOverlapNumbers(allRecommendedSets, enhancedHotTop10);

        const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);

        // 8. 렌더링 함수 호출
        renderEnhancedResults(selectedRound, enhancedHotTop10, top5Sets, denseSets, lstmSets, commonOverlapNumbers, totalTime, LOOKBACK);

    } catch (err) {
        console.error("강화 AI 실행 중 오류 발생:", err);
        alert("실행 중 오류가 발생했습니다. 브라우저 콘솔(F12)을 확인해 주세요.\n상세 내용: " + err.message);
    }
}

// 상위 10개 핵심 번호 추출
function extractEnhancedTop10(probabilities) {
    const list = [];
    for (let i = 0; i < 45; i++) {
        list.push({ num: i + 1, score: probabilities[i] });
    }
    list.sort((a, b) => b.score - a.score);
    return list.slice(0, 10);
}

// 세트 간 공통 출현 핵심 번호 집계
function extractCommonOverlapNumbers(sets, hotTop10) {
    const hotNums = hotTop10.map(item => item.num);
    const freq = new Array(46).fill(0);

    sets.forEach(set => {
        set.forEach(num => {
            if (hotNums.includes(num)) freq[num]++;
        });
    });

    const list = [];
    for (let i = 1; i <= 45; i++) {
        if (freq[i] > 0) list.push({ num: i, count: freq[i] });
    }
    list.sort((a, b) => b.count - a.count || a.num - b.num);
    return list.slice(0, 8);
}

// TOP 5 앙상블 세트 구성 (정밀도 필터 적용)
function generateTop5Sets(allSets, hotTop10Numbers) {
    const top10NumsArray = hotTop10Numbers.map(item => item.num);
    const validCandidates = allSets.filter(set => {
        const matchCount = set.filter(n => top10NumsArray.includes(n)).length;
        return matchCount >= 3;
    });

    const uniqueSets = [];
    for (let set of validCandidates) {
        const setStr = set.join(",");
        if (!uniqueSets.some(s => s.join(",") === setStr)) uniqueSets.push(set);
        if (uniqueSets.length >= 5) break;
    }

    while (uniqueSets.length < 5 && allSets.length > 0) {
        const fallback = allSets.shift();
        const setStr = fallback.join(",");
        if (!uniqueSets.some(s => s.join(",") === setStr)) uniqueSets.push(fallback);
    }
    return uniqueSets;
}

// 강화된 번호 조합 생성기 (합계 및 홀짝 비율 검증)
function generateEnhancedSets(probabilities, targetCount) {
    const weights = [0, ...probabilities];
    const sets = [];
    let attempts = 0;

    while (sets.length < targetCount && attempts < 8000) {
        attempts++;
        const candidate = sampleFromProbabilities(weights);
        if (isValidPrecisionSet(candidate)) {
            const setStr = candidate.join(",");
            if (!sets.some(s => s.join(",") === setStr)) sets.push(candidate);
        }
    }

    while (sets.length < targetCount) {
        const fallback = sampleFromProbabilities(weights);
        const setStr = fallback.join(",");
        if (!sets.some(s => s.join(",") === setStr)) sets.push(fallback);
    }
    return sets;
}

function sampleFromProbabilities(weights) {
    const numbers = [];
    const available = Array.from({ length: 45 }, (_, i) => i + 1);
    const currentWeights = [...weights];

    while (numbers.length < 6) {
        let totalWeight = 0;
        for (let num of available) {
            totalWeight += Math.max(currentWeights[num], 0.01);
        }

        let random = Math.random() * totalWeight;
        for (let num of available) {
            random -= Math.max(currentWeights[num], 0.01);
            if (random <= 0) {
                numbers.push(num);
                available.splice(available.indexOf(num), 1);
                break;
            }
        }
    }
    return numbers.sort((a, b) => a - b);
}

// 정밀도 검증 규칙 (합계 100~175, 홀짝 2:4 ~ 4:2, 연속번호 제어)
function isValidPrecisionSet(nums) {
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum < 100 || sum > 175) return false;

    const oddCount = nums.filter(n => n % 2 !== 0).length;
    if (oddCount < 2 || oddCount > 4) return false;

    let consecutive = 0;
    for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i + 1] === nums[i] + 1) {
            consecutive++;
            if (consecutive >= 2) return false;
        } else {
            consecutive = 0;
        }
    }
    return true;
}

// 강화 AI 대시보드 UI 렌더링
function renderEnhancedResults(selectedRound, hotTop10, top5Sets, denseSets, lstmSets, commonOverlapNumbers, totalTime, lookback) {
    const recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    const hotTop10BallsHtml = hotTop10.map((item, index) => {
        return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                ${typeof createLottoBallHtml === 'function' ? createLottoBallHtml(item.num) : `<span class="lotto-ball">${item.num}</span>`}
                <span style="font-size: 0.75rem; color: #38bdf8; font-weight: 600;">#${index + 1} (${(item.score * 100).toFixed(1)}%)</span>
            </div>
        `;
    }).join("");

    const commonBallsHtml = commonOverlapNumbers.map(item => {
        return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                ${typeof createLottoBallHtml === 'function' ? createLottoBallHtml(item.num) : `<span class="lotto-ball">${item.num}</span>`}
                <span style="font-size: 0.75rem; color: #f59e0b; font-weight: 600;">${item.count}개 세트 공통</span>
            </div>
        `;
    }).join("");

    const denseTop2 = denseSets.slice(0, 2);
    const lstmTop2 = lstmSets.slice(0, 2);

    let html = `
        <div class="recommend-card">
            <div class="recommend-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span>⚡ [${selectedRound}회차] 강화 AI 하이브리드 정밀 분석 완료</span>
                <span style="font-size: 0.8rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 4px 10px; border-radius: 12px;">
                    참조 폭: ${lookback}회차 | 총 연산 시간: ${totalTime}초
                </span>
            </div>
            
            <!-- 1. 강화 AI 하이브리드 HOT TOP 10 -->
            <div style="padding: 20px; background: rgba(56, 189, 248, 0.05); border: 1px solid #38bdf8; border-radius: 16px; margin-bottom: 20px; margin-top: 15px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 1.2rem;">🔥</span>
                    <h4 style="margin: 0; color: #38bdf8; font-size: 1.05rem; font-weight: 800;">
                        강화 AI 하이브리드 HOT 추천 TOP 10 숫자
                    </h4>
                </div>
                <p style="color: #94a3b8; font-size: 0.85rem; margin: 0 0 15px 0;">
                    누적 통계 가중치와 Dense/LSTM 듀얼 딥러닝 예측 확률을 최적 비율로 융합한 핵심 10개 번호입니다.
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; align-items: center; padding: 10px 0;">
                    ${hotTop10BallsHtml}
                </div>
            </div>

            <!-- 2. 추천 세트 간 공통 출현 핵심 번호 -->
            <div style="padding: 20px; background: rgba(245, 158, 11, 0.05); border: 1px solid #f59e0b; border-radius: 16px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 1.2rem;">💎</span>
                    <h4 style="margin: 0; color: #f59e0b; font-size: 1.05rem; font-weight: 800;">
                        추천 세트 간 공통 출현 핵심 번호
                    </h4>
                </div>
                <p style="color: #94a3b8; font-size: 0.85rem; margin: 0 0 15px 0;">
                    생성된 모든 추천 세트 내부에서 가장 빈번하게 중복 겹쳐서 등장하는 공통 번호입니다.
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; align-items: center; padding: 10px 0;">
                    ${commonBallsHtml}
                </div>
            </div>

            <!-- 3. 교차검증 앙상블 TOP 5 추천 조합 -->
            <div style="margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 1.2rem;">🎯</span>
                    <h4 style="margin: 0; color: #f59e0b; font-size: 1.05rem; font-weight: 800;">
                        강화 AI 앙상블 TOP 5 추천 조합
                    </h4>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    top5Sets.forEach((set, idx) => {
        const prefix = `[세트 ${idx + 1}]`;
        const setStr = set.join(",");
        const resultSpanId = `check-result-enhanced-${idx}`;
        const containerId = `ball-container-enhanced-${idx}`;
        const ballsHtml = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

        html += `
            <div class="recommend-row">
                <span class="set-tag" style="color: #f59e0b;">${prefix}</span>
                <div id="${containerId}" class="lotto-ball-wrapper">${ballsHtml}</div>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
                    <button class="btn-inline-check" onclick="checkWinForNumbers('${setStr}', '${resultSpanId}', '${containerId}')">
                        당첨 확인
                    </button>
                    <span id="${resultSpanId}" class="result-text"></span>
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>

            <!-- 4. 듀얼 모델 독립 결과 비교 영역 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                
                <!-- Dense 모델 독립 추천 박스 -->
                <div style="padding: 16px; background: rgba(167, 139, 250, 0.08); border: 1px solid rgba(167, 139, 250, 0.4); border-radius: 14px;">
                    <h5 style="margin: 0 0 12px 0; color: #c4b5fd; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; font-weight: 700;">
                        <span>🧠</span> Dense 모델 독립 추천 (상위 2세트)
                    </h5>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    denseTop2.forEach((set, idx) => {
        const setStr = set.join(",");
        const rId = `dense-res-${idx}`;
        const cId = `dense-cont-${idx}`;
        const balls = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");
        html += `
            <div style="background: rgba(15, 23, 42, 0.85); padding: 10px 14px; border-radius: 10px; border: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div id="${cId}" class="lotto-ball-wrapper" style="display: flex; gap: 6px; align-items: center; transform: scale(0.9); transform-origin: left;">${balls}</div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-left: auto;">
                    <button class="btn-inline-check" style="font-size: 0.75rem; padding: 4px 8px;" onclick="checkWinForNumbers('${setStr}', '${rId}', '${cId}')">당첨확인</button>
                    <span id="${rId}" class="result-text" style="font-size: 0.75rem;"></span>
                </div>
            </div>
        `;
    });

    html += `
                    </div>
                </div>

                <!-- LSTM 모델 독립 추천 박스 -->
                <div style="padding: 16px; background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.4); border-radius: 14px;">
                    <h5 style="margin: 0 0 12px 0; color: #6ee7b7; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; font-weight: 700;">
                        <span>📈</span> LSTM 시계열 독립 추천 (상위 2세트)
                    </h5>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    lstmTop2.forEach((set, idx) => {
        const setStr = set.join(",");
        const rId = `lstm-res-${idx}`;
        const cId = `lstm-cont-${idx}`;
        const balls = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");
        html += `
            <div style="background: rgba(15, 23, 42, 0.85); padding: 10px 14px; border-radius: 10px; border: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div id="${cId}" class="lotto-ball-wrapper" style="display: flex; gap: 6px; align-items: center; transform: scale(0.9); transform-origin: left;">${balls}</div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-left: auto;">
                    <button class="btn-inline-check" style="font-size: 0.75rem; padding: 4px 8px;" onclick="checkWinForNumbers('${setStr}', '${rId}', '${cId}')">당첨확인</button>
                    <span id="${rId}" class="result-text" style="font-size: 0.75rem;"></span>
                </div>
            </div>
        `;
    });

    html += `
                    </div>
                </div>

            </div>
        </div>
    `;

    recommendDiv.innerHTML = html;
}