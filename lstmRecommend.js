/**
 * [LSTM 단독 시계열 AI 추천 모듈 - 정밀도 극대화 및 이어서 학습 버전]
 * - IndexedDB 기반 모델 저장 및 이어서 학습(Fine-Tuning) 지원
 * - 직전 회차들의 시계열 패턴(X)과 실제 다음 회차 당첨 번호(Y)를 정답 레이블로 매칭하여 학습합니다.
 */

async function lstmRecommend() {
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
        
        // 선택한 회차 이하의 과거 데이터 필터링 및 정렬
        const historicalData = lottoData
            .filter(d => Number(d["회차"] || d.round) <= selectedRound)
            .sort((a, b) => Number(a["회차"] || b.round) - Number(b["회차"] || b.round));

        if (historicalData.length < 35) {
            alert("LSTM 시계열 학습을 위한 최소 데이터(35회차 이상)가 부족합니다.");
            return;
        }

        const startTime = performance.now();

        // UI에 로딩 및 프로그레스 표시
        const recommendDiv = document.getElementById("recommend");
        if (recommendDiv) {
            recommendDiv.innerHTML = `
                <div class="recommend-card" style="text-align: center; padding: 35px;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📈</div>
                    <h3 style="color: #34d399; margin: 0 0 10px 0;">LSTM 시계열 정밀 모델 이어서 학습 중...</h3>
                    <p style="color: #94a3b8; font-size: 0.95rem;">[단독 LSTM 순환 신경망] / [1회차 ~ ${selectedRound}회차] 저장된 모델 가중치 로드 및 학습 중입니다.</p>
                    <div id="lstm-progress" style="color: #6ee7b7; font-weight: bold; margin-top: 15px;">저장된 모델 불러오는 중...</div>
                </div>
            `;
        }

        await new Promise(resolve => setTimeout(resolve, 50));

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
        const progressEl = document.getElementById("lstm-progress");

        if (progressEl) progressEl.innerText = "LSTM 시계열 신경망 이어서 훈련 중 (Epochs: 60)...";
        await tf.nextFrame();

        const compileConfig = { optimizer: tf.train.adam(0.0005), loss: 'binaryCrossentropy' };

        // 기존에 저장된 LSTM 모델 불러오기 (없으면 새로 생성)
        let modelLstm = null;
        try {
            modelLstm = await tf.loadLayersModel('indexeddb://lotto-lstm-standalone-model');
            modelLstm.compile(compileConfig);
            console.log("저장된 LSTM 단독 모델을 불러와 추가 학습을 진행합니다.");
        } catch (e) {
            console.log("저장된 LSTM 단독 모델이 없어 새로 생성합니다.");
        }

        if (!modelLstm) {
            modelLstm = tf.sequential();
            modelLstm.add(tf.layers.lstm({ units: 64, inputShape: [LOOKBACK, 45], returnSequences: false }));
            modelLstm.add(tf.layers.dropout({ rate: 0.15 }));
            modelLstm.add(tf.layers.dense({ units: 45, activation: 'sigmoid' }));
            modelLstm.compile(compileConfig);
        }

        // 이어서 추가 학습 진행 (Epochs: 60)
        await modelLstm.fit(xs, ys, { epochs: 60, batchSize: 16, verbose: 0 });

        // 학습 완료 후 브라우저 저장소에 최신 가중치 자동 저장
        await modelLstm.save('indexeddb://lotto-lstm-standalone-model').catch(err => console.log("LSTM 모델 저장 실패:", err));

        if (progressEl) progressEl.innerText = "LSTM 예측 확률 추출 및 상위 10세트 조합 생성 중...";
        await tf.nextFrame();

        const recentInput = vectors.slice(-LOOKBACK);
        const inputTensor = tf.tensor3d([recentInput]);
        const predLstmTensor = modelLstm.predict(inputTensor);
        const probLstm = await predLstmTensor.data();
        const lstmProbArray = Array.from(probLstm);

        xs.dispose();
        ys.dispose();
        inputTensor.dispose();
        predLstmTensor.dispose();
        modelLstm.dispose();

        // LSTM 확률 기준 상위 HOT 10 숫자 추출
        const lstmHotTop10 = extractLstmTop10(lstmProbArray);

        // LSTM 상위 10세트 후보군 대량 생성 후 필터링
        const lstmSets = generateLstmSets(lstmProbArray, 80);
        const top10Sets = selectTop10LstmSets(lstmSets, lstmHotTop10);

        const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);

        // 결과 화면 렌더링
        renderLstmResults(selectedRound, lstmHotTop10, top10Sets, totalTime, LOOKBACK);

        // [중요] LSTM 분석 완료 상태 체크 실행
        markAnalysisComplete('lstm');

    } catch (err) {
        console.error("LSTM 추천 실행 중 오류 발생:", err);
        alert("실행 중 오류가 발생했습니다. 브라우저 콘솔(F12)을 확인해 주세요.\n상세 내용: " + err.message);
    }
}

// LSTM 상위 10개 핵심 번호 추출
function extractLstmTop10(probabilities) {
    const list = [];
    for (let i = 0; i < 45; i++) {
        list.push({ num: i + 1, score: probabilities[i] });
    }
    list.sort((a, b) => b.score - a.score);
    return list.slice(0, 10);
}

// LSTM 세트 간 공통 출현 번호 집계 함수
function extractLstmCommonOverlapNumbers(sets, hotTop10) {
    if (!sets || sets.length === 0) return [];
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

// LSTM 조합 생성기
function generateLstmSets(probabilities, targetCount) {
    const weights = [0, ...probabilities];
    const sets = [];
    let attempts = 0;

    while (sets.length < targetCount && attempts < 8000) {
        attempts++;
        const candidate = sampleLstmNumbers(weights);
        if (isValidLstmSet(candidate)) {
            const setStr = candidate.join(",");
            if (!sets.some(s => s.join(",") === setStr)) sets.push(candidate);
        }
    }

    while (sets.length < targetCount) {
        const fallback = sampleLstmNumbers(weights);
        const setStr = fallback.join(",");
        if (!sets.some(s => s.join(",") === setStr)) sets.push(fallback);
    }
    return sets;
}

function sampleLstmNumbers(weights) {
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

function isValidLstmSet(nums) {
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

function selectTop10LstmSets(allSets, hotTop10Numbers) {
    const top10NumsArray = hotTop10Numbers.map(item => item.num);
    const validCandidates = allSets.filter(set => {
        const matchCount = set.filter(n => top10NumsArray.includes(n)).length;
        return matchCount >= 3;
    });

    const uniqueSets = [];
    for (let set of validCandidates) {
        const setStr = set.join(",");
        if (!uniqueSets.some(s => s.join(",") === setStr)) uniqueSets.push(set);
        if (uniqueSets.length >= 10) break;
    }

    while (uniqueSets.length < 10 && allSets.length > 0) {
        const fallback = allSets.shift();
        const setStr = fallback.join(",");
        if (!uniqueSets.some(s => s.join(",") === setStr)) uniqueSets.push(fallback);
    }
    return uniqueSets.slice(0, 10);
}

// LSTM 상위 10세트 렌더링 화면
function renderLstmResults(selectedRound, hotTop10, top10Sets, totalTime, lookback) {
    const recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    const hotTop10Html = hotTop10.map((item, index) => `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 4px;">
            ${typeof createLottoBallHtml === 'function' ? createLottoBallHtml(item.num) : `<span class="lotto-ball">${item.num}</span>`}
            <span style="font-size: 0.8rem; color: #34d399; font-weight: 700; background: rgba(52, 211, 153, 0.12); padding: 3px 8px; border-radius: 6px;">#${index + 1} (${(item.score * 100).toFixed(1)}%)</span>
        </div>
    `).join("");

    // LSTM HOT TOP 10 번호 문자열 생성 (종합 바스켓 전송용)
    const lstmTop10NumbersStr = hotTop10.map(item => item.num).join(",");

    const lstmCommonOverlap = extractLstmCommonOverlapNumbers(top10Sets, hotTop10);
    const lstmCommonBallsHtml = lstmCommonOverlap.map(item => `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 4px;">
            ${typeof createLottoBallHtml === 'function' ? createLottoBallHtml(item.num) : `<span class="lotto-ball">${item.num}</span>`}
            <span style="font-size: 0.8rem; color: #34d399; font-weight: 700; background: rgba(52, 211, 153, 0.12); padding: 3px 8px; border-radius: 6px;">${item.count}개 세트 공통</span>
        </div>
    `).join("");
    const lstmCommonNumbersStr = lstmCommonOverlap.map(item => item.num).join(",");

    let html = `
        <div class="recommend-card" style="padding: 25px;">
            <div class="recommend-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="font-size: 1.15rem; font-weight: 800;">📈 [${selectedRound}회차] LSTM 시계열 단독 상위 10세트 분석 완료 (이어서 학습 반영)</span>
                <span style="font-size: 0.85rem; background: rgba(52, 211, 153, 0.15); color: #34d399; padding: 6px 14px; border-radius: 12px; font-weight: 600;">
                    참조 폭: ${lookback}회차 | 소요 시간: ${totalTime}초
                </span>
            </div>

            <!-- LSTM HOT TOP 10 (종합 보내기 버튼 포함) -->
            <div style="padding: 24px; background: rgba(52, 211, 153, 0.05); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 18px; margin-bottom: 25px; margin-top: 15px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.3rem;">🔥</span>
                        <h4 style="margin: 0; color: #34d399; font-size: 1.1rem; font-weight: 800;">
                            LSTM 시계열 기반 HOT 추천 TOP 10 숫자
                        </h4>
                    </div>
                    <button class="btn-inline-check" style="background: #0284c7; color: white; padding: 8px 14px; font-size: 0.85rem;" onclick="sendToComprehensiveBasket('LSTM TOP10번호', '${lstmTop10NumbersStr}', 'LSTM단독분석')">종합 보내기</button>
                </div>
                <p style="color: #94a3b8; font-size: 0.9rem; margin: 0 0 20px 0; line-height: 1.4;">
                    오직 LSTM 순환 신경망의 시계열 가중치 예측에서 가장 높게 평가된 핵심 10개 번호입니다.
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-items: center; padding: 10px 0;">
                    ${hotTop10Html}
                </div>
            </div>

            <!-- LSTM 공통 핵심 번호 -->
            <div style="padding: 24px; background: rgba(52, 211, 153, 0.05); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 18px; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.3rem;">💎</span>
                        <h4 style="margin: 0; color: #34d399; font-size: 1.1rem; font-weight: 800;">
                            LSTM 추천 세트 간 공통 출현 핵심 번호
                        </h4>
                    </div>
                    <button class="btn-inline-check" style="background: #0284c7; color: white; padding: 8px 14px; font-size: 0.85rem;" onclick="sendToComprehensiveBasket('LSTM 공통핵심번호', '${lstmCommonNumbersStr}', 'LSTM단독분석')">종합 보내기</button>
                </div>
                <p style="color: #94a3b8; font-size: 0.9rem; margin: 0 0 20px 0; line-height: 1.4;">
                    생성된 LSTM 추천 세트 내에서 빈번하게 중복 등장하는 겹치기 공통 번호입니다.
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-items: center; padding: 10px 0;">
                    ${lstmCommonBallsHtml}
                </div>
            </div>

            <!-- LSTM 상위 10세트 추천 조합 -->
            <div style="margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                    <span style="font-size: 1.3rem;">🎯</span>
                    <h4 style="margin: 0; color: #34d399; font-size: 1.15rem; font-weight: 800;">
                        LSTM 단독 최적화 TOP 10 추천 조합
                    </h4>
                </div>
                <div style="display: flex; flex-direction: column; gap: 14px;">
    `;

    top10Sets.forEach((set, idx) => {
        const prefix = `[세트 ${idx + 1}]`;
        const setStr = set.join(",");
        const resultSpanId = `check-result-lstm-${idx}`;
        const containerId = `ball-container-lstm-${idx}`;
        const ballsHtml = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

        html += `
            <div class="recommend-row" style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(52, 211, 153, 0.35); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px;">
                <span class="set-tag" style="color: #34d399; font-weight: 700; min-width: 90px;">${prefix}</span>
                <div id="${containerId}" class="lotto-ball-wrapper" style="display: flex; gap: 10px; align-items: center;">${ballsHtml}</div>
                <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                    <button class="btn-inline-check" style="background: #0284c7; color: white; padding: 8px 14px;" onclick="sendToComprehensiveBasket('LSTM 세트 ${idx + 1}', '${setStr}', 'LSTM단독분석')">종합 보내기</button>
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
}

// 분석 완료 상태 등록
markAnalysisComplete('lstm');