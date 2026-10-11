/**
 * [심화 하이브리드 AI 교차 비교 및 정밀 추천 모듈 - 안정성 강화 버전]
 * - IndexedDB 충돌 원인을 완전히 제거하고 실시간 정밀 앙상블 수행
 * - 통계 가중치(20%) + Dense(40%) + LSTM(40%) 최적 조합
 */

async function multiAiComparativeRecommend() {
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
            alert("심화 딥러닝 학습을 위한 최소 데이터(35회차 이상)가 부족합니다.");
            return;
        }

        const startTime = performance.now();

        // UI에 로딩 및 프로그레스 표시
        const recommendDiv = document.getElementById("recommend");
        if (recommendDiv) {
            recommendDiv.innerHTML = `
                <div class="recommend-card" style="text-align: center; padding: 35px;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">🤖</div>
                    <h3 style="color: #38bdf8; margin: 0 0 10px 0;">하이브리드 AI 심화 교차 분석 중...</h3>
                    <p style="color: #94a3b8; font-size: 0.95rem;">[Dense + LSTM + 통계] 모델을 활용해 다음 회차 타겟을 정밀 분석하고 있습니다.</p>
                    <div id="ai-progress" style="color: #a78bfa; font-weight: bold; margin-top: 15px;">신경망 훈련 준비 중...</div>
                </div>
            `;
        }

        await new Promise(resolve => setTimeout(resolve, 50));

        const progressEl = document.getElementById("ai-progress");

        // [A파트] 통계 기반 누적 빈도 및 가중치 산출
        const freq = new Array(46).fill(0);
        historicalData.forEach(draw => {
            const numbers = draw["당첨번호"] || draw.numbers;
            if (Array.isArray(numbers)) {
                numbers.forEach(num => { if (num >= 1 && num <= 45) freq[num]++; });
            }
        });
        const maxFreq = Math.max(...freq, 1);
        const statScores = new Float32Array(45);
        for (let i = 1; i <= 45; i++) {
            statScores[i - 1] = (freq[i] + 1) / (maxFreq + 1);
        }

        // [B파트] 텐서 데이터 준비 (직전 10회차 패턴 X -> 다음 회차 당첨 번호 Y 타겟 매칭)
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

        // 1. Dense 모델 생성 및 학습
        if (progressEl) progressEl.innerText = "[1/2] Dense 정밀 신경망 학습 중 (Epochs: 40)...";
        await tf.nextFrame();

        const modelDense = tf.sequential();
        modelDense.add(tf.layers.flatten({ inputShape: [LOOKBACK, 45] }));
        modelDense.add(tf.layers.dense({ units: 128, activation: 'relu' }));
        modelDense.add(tf.layers.dropout({ rate: 0.15 }));
        modelDense.add(tf.layers.dense({ units: 45, activation: 'sigmoid' }));
        modelDense.compile({ optimizer: tf.train.adam(0.001), loss: 'binaryCrossentropy' });
        
        await modelDense.fit(xs, ys, { epochs: 40, batchSize: 16, verbose: 0 });

        // 2. LSTM 모델 생성 및 학습
        if (progressEl) progressEl.innerText = "[2/2] LSTM 순환 신경망 학습 중 (Epochs: 40)...";
        await tf.nextFrame();

        const modelLstm = tf.sequential();
        modelLstm.add(tf.layers.lstm({ units: 64, inputShape: [LOOKBACK, 45], returnSequences: false }));
        modelLstm.add(tf.layers.dense({ units: 45, activation: 'sigmoid' }));
        modelLstm.compile({ optimizer: tf.train.adam(0.001), loss: 'binaryCrossentropy' });

        await modelLstm.fit(xs, ys, { epochs: 40, batchSize: 16, verbose: 0 });

        // [C파트] 예측 및 앙상블 스코어 융합
        if (progressEl) progressEl.innerText = "통계 및 딥러닝 예측 결과 앙상블 융합 중...";
        await tf.nextFrame();

        const recentInput = vectors.slice(-LOOKBACK);
        const inputTensor = tf.tensor3d([recentInput]);

        const probDense = await modelDense.predict(inputTensor).data();
        const probLstm = await modelLstm.predict(inputTensor).data();

        // 앙상블 비율: 통계(20%) + Dense(40%) + LSTM(40%)
        const comparativeScores = new Float32Array(45);
        for (let i = 0; i < 45; i++) {
            comparativeScores[i] = (statScores[i] * 0.2) + (probDense[i] * 0.4) + (probLstm[i] * 0.4);
        }

        // 메모리 안전 해제
        xs.dispose();
        ys.dispose();
        inputTensor.dispose();
        modelDense.dispose();
        modelLstm.dispose();

        // [D파트] 상위 추천 세트 생성 및 렌더링
        const comparativeSets = generateComparativeSets(comparativeScores, 5);
        const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);

        renderComparativeResults(selectedRound, comparativeSets, totalTime);

        if (typeof markAnalysisComplete === "function") {
            markAnalysisComplete('multiAiComparative');
        }

    } catch (err) {
        console.error("AI 분석 중 오류 발생:", err);
        alert("분석 중 오류가 발생했습니다: " + err.message);
    }
}

// 조합 생성 및 필터링 (합계, 홀짝, 연번 제한 검증)
function generateComparativeSets(scores, count) {
    const weights = [0, ...scores];
    const sets = [];
    let attempts = 0;

    while (sets.length < count && attempts < 5000) {
        attempts++;
        const candidate = sampleComparativeNumbers(weights);
        const sum = candidate.reduce((a, b) => a + b, 0);
        if (sum >= 100 && sum <= 175) {
            const oddCount = candidate.filter(n => n % 2 !== 0).length;
            if (oddCount >= 2 && oddCount <= 4) {
                const setStr = candidate.join(",");
                if (!sets.some(s => s.join(",") === setStr)) {
                    sets.push(candidate);
                }
            }
        }
    }

    while (sets.length < count) {
        const fallback = sampleComparativeNumbers(weights);
        const setStr = fallback.join(",");
        if (!sets.some(s => s.join(",") === setStr)) sets.push(fallback);
    }
    return sets;
}

function sampleComparativeNumbers(weights) {
    const numbers = [];
    const available = Array.from({ length: 45 }, (_, i) => i + 1);
    const currentWeights = [...weights];

    while (numbers.length < 6) {
        let totalWeight = 0;
        for (let num of available) { totalWeight += Math.max(currentWeights[num], 0.01); }
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

// 결과 화면 렌더링
function renderComparativeResults(selectedRound, sets, totalTime) {
    const recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    let html = `
        <div class="recommend-card" style="padding: 25px;">
            <div class="recommend-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="font-size: 1.15rem; font-weight: 800; color: #38bdf8;">🤖 [${selectedRound}회차] 하이브리드 교차 비교 추천 결과</span>
                <span style="font-size: 0.85rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 6px 14px; border-radius: 12px; font-weight: 600;">
                    연산 시간: ${totalTime}초
                </span>
            </div>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px;">
                통계와 딥러닝 신경망의 다음 회차 예측 점수를 상호 교차 비교하여 검증된 최종 추천 숫자 조합입니다.
            </p>
            <div style="display: flex; flex-direction: column; gap: 14px;">
    `;

    sets.forEach((set, idx) => {
        const setStr = set.join(",");
        const rId = `comp-res-${idx}`;
        const cId = `comp-cont-${idx}`;
        const ballsHtml = set.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

        html += `
            <div class="recommend-row" style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); padding: 14px 18px; border-radius: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 15px;">
                <span class="set-tag" style="color: #38bdf8; font-weight: 700; min-width: 90px;">[비교 추천 ${idx + 1}]</span>
                <div id="${cId}" class="lotto-ball-wrapper" style="display: flex; gap: 10px; align-items: center;">${ballsHtml}</div>
                <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                    <button class="btn-inline-check" style="background: #0284c7; color: white; padding: 8px 14px;" onclick="sendToComprehensiveBasket('AI교차비교 세트 ${idx + 1}', '${setStr}', '다중AI비교')">종합 보내기</button>
                    <button class="btn-inline-check" style="padding: 8px 14px;" onclick="checkWinForNumbers('${setStr}', '${rId}', '${cId}')">당첨 확인</button>
                    <span id="${rId}" class="result-text" style="font-size: 0.9rem;"></span>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    recommendDiv.innerHTML = html;
}