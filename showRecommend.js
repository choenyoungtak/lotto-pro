// 숫자에 따른 로또 공 HTML 생성
function createLottoBallHtml(num) {
    let colorClass = "ball-1";
    if (num >= 11 && num <= 20) colorClass = "ball-11";
    else if (num >= 21 && num <= 30) colorClass = "ball-21";
    else if (num >= 31 && num <= 40) colorClass = "ball-31";
    else if (num >= 41 && num <= 45) colorClass = "ball-41";

    return `<div class="lotto-ball ${colorClass}">${num}</div>`;
}

// 추천 목록 UI 출력
function showRecommend(title, numbers) {
    const recommendDiv = document.getElementById("recommend");
    if (!recommendDiv) return;

    const isMultipleSets = Array.isArray(numbers[0]);
    const sets = isMultipleSets ? numbers : [numbers];

    let html = `
        <div class="recommend-card">
            <div class="recommend-header">${title}</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    sets.forEach((set, idx) => {
        const prefix = isMultipleSets ? `[${String.fromCharCode(65 + idx)} 세트]` : "[추천]";
        const setStr = set.join(",");
        const resultSpanId = `check-result-${idx}`;
        const containerId = `ball-container-${idx}`;
        const ballsHtml = set.map(n => createLottoBallHtml(n)).join("");

        html += `
            <div class="recommend-row">
                <span class="set-tag">${prefix}</span>
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

    html += `</div></div>`;
    recommendDiv.innerHTML = html;
}

// 개별 당첨 확인 및 일치 번호 표기 처리
function checkWinForNumbers(numberString, targetSpanId, containerId) {
    const resultSpan = document.getElementById(targetSpanId);
    if (!lottoData || lottoData.length === 0) return;

    const roundSelect = document.getElementById("roundSelect");
    if (!roundSelect) return;

    const currentRound = Number(roundSelect.value);
    const targetRound = currentRound + 1;

    // N + 1회차 데이터 탐색
    const draw = lottoData.find(d => Number(d["회차"] || d.round) === targetRound);

    if (!draw) {
        if (resultSpan) {
            resultSpan.style.color = "#94a3b8";
            resultSpan.innerText = `⚠️ [${targetRound}회차] 데이터 없음`;
        }
        return;
    }

    const user = numberString.split(",").map(Number);
    const winNumbers = (draw["당첨번호"] || draw.numbers || []).map(Number);
    const bonusNumber = Number(draw["보너스번호"] || draw.bonus);

    // 1. 일치하는 번호 및 보너스 번호 계산
    const hitNumbers = user.filter(n => winNumbers.includes(n)).sort((a, b) => a - b);
    const hitCount = hitNumbers.length;
    const hasBonus = user.includes(bonusNumber);

    // 2. 화면 로또 공 시각적 하이라이트 (일치 공은 확대 & Glow, 불일치 공은 반투명)
    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const balls = container.querySelectorAll(".lotto-ball");
            balls.forEach(ball => {
                const val = Number(ball.innerText);
                if (winNumbers.includes(val)) {
                    ball.classList.add("ball-hit");
                    ball.classList.remove("ball-bonus", "ball-miss");
                } else if (val === bonusNumber) {
                    ball.classList.add("ball-bonus");
                    ball.classList.remove("ball-hit", "ball-miss");
                } else {
                    ball.classList.add("ball-miss");
                    ball.classList.remove("ball-hit", "ball-bonus");
                }
            });
        }
    }

    // 3. 등수 판정
    let grade = "낙첨";
    let color = "#ef4444"; // 기본 빨강 (낙첨)

    if (hitCount === 6) { grade = "1등 🎉"; color = "#f59e0b"; }
    else if (hitCount === 5 && hasBonus) { grade = "2등 🥈"; color = "#3b82f6"; }
    else if (hitCount === 5) { grade = "3등 🥉"; color = "#10b981"; }
    else if (hitCount === 4) { grade = "4등 🏅"; color = "#a855f7"; }
    else if (hitCount === 3) { grade = "5등 🎗️"; color = "#06b6d4"; }

    // 4. 일치 번호 표기 텍스트 조합
    let hitDetailText = "";
    if (hitNumbers.length > 0) {
        hitDetailText = ` (일치: ${hitNumbers.join(", ")}${hasBonus ? ` + 보너스 ${bonusNumber}` : ""})`;
    } else if (hasBonus) {
        hitDetailText = ` (보너스 번호 ${bonusNumber} 적중)`;
    } else {
        hitDetailText = ` (일치 번호 없음)`;
    }

    // 5. 결과 출력
    if (resultSpan) {
        resultSpan.style.color = color;
        resultSpan.innerHTML = `👉 [${targetRound}회차] <strong>${grade}</strong>${hitDetailText}`;
    }
}