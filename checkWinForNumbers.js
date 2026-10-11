/**
 * [공통 당첨 확인 함수 - 다음 회차 전용]
 * - 입력된 번호 세트와 '다음 회차(selectedRound + 1)'의 당첨 번호를 비교하여 결과를 출력합니다.
 */
function checkWinForNumbers(numbersStr, resultSpanId, containerId) {
    if (typeof lottoData === "undefined" || !lottoData || lottoData.length === 0) {
        alert("로또 데이터가 로드되지 않았습니다.");
        return;
    }

    const roundSelect = document.getElementById("roundSelect");
    if (!roundSelect) {
        alert("회차 선택 드롭다운을 찾을 수 없습니다.");
        return;
    }

    const selectedRound = Number(roundSelect.value);
    
    // 만약 전달받은 numbersStr이 비어있거나 undefined라면 컨테이너(DOM)에서 직접 숫자를 추출 시도
    let rawStr = numbersStr;
    if ((!rawStr || rawStr === "undefined") && containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const spans = container.querySelectorAll(".lotto-ball, span");
            if (spans.length > 0) {
                rawStr = Array.from(spans).map(el => el.textContent.trim()).filter(n => !isNaN(n) && n !== "").join(",");
            } else {
                rawStr = container.innerText.trim();
            }
        }
    }

    if (!rawStr || rawStr === "undefined") {
        alert("검증할 번호 데이터를 찾을 수 없습니다.");
        return;
    }

    // 문자열을 안전하게 배열로 변환
    let userNums = [];
    if (String(rawStr).includes(",")) {
        userNums = String(rawStr).split(",").map(Number).filter(n => !isNaN(n));
    } else {
        const matches = String(rawStr).match(/\d+/g);
        if (matches) {
            userNums = matches.map(Number);
        }
    }

    // 번호가 6개가 아닐 때 두 자리씩 파싱 시도
    if (userNums.length !== 6) {
        const cleanNums = [];
        let strVal = String(rawStr).replace(/[^0-9]/g, "");
        if (strVal.length === 12) {
            for (let i = 0; i < strVal.length; i += 2) {
                cleanNums.push(Number(strVal.substr(i, 2)));
            }
            if (cleanNums.length === 6) userNums = cleanNums;
        }
    }

    if (userNums.length !== 6) {
        alert(`검증할 번호 6개가 올바르지 않습니다. (인식된 번호: ${userNums.join(", ")})`);
        return;
    }

    userNums.sort((a, b) => a - b);

    // 그 다음 회차(selectedRound + 1) 데이터만 탐색
    const nextRoundNumber = selectedRound + 1;
    const nextDraw = lottoData.find(d => Number(d["회차"] || d.round) === nextRoundNumber);

    const resultSpan = document.getElementById(resultSpanId);
    if (!resultSpan) return;

    let resultHtml = "";

    // [그 다음 회차 당첨 확인 결과만 출력]
    if (nextDraw) {
        const nextWinNums = (nextDraw["당첨번호"] || nextDraw.numbers || []).map(Number);
        const nextBonusNum = Number(nextDraw["보너스번호"] || nextDraw.bonus || 0);

        const nextMatchCount = userNums.filter(n => nextWinNums.includes(n)).length;
        const nextHasBonus = userNums.includes(nextBonusNum);

        let nextRankText = "낙첨";
        let nextRankColor = "#94a3b8";

        if (nextMatchCount === 6) { nextRankText = "🎉 1등 당첨!"; nextRankColor = "#f59e0b"; }
        else if (nextMatchCount === 5 && nextHasBonus) { nextRankText = "🔥 2등 당첨!"; nextRankColor = "#38bdf8"; }
        else if (nextMatchCount === 5) { nextRankText = "✨ 3등 당첨!"; nextRankColor = "#34d399"; }
        else if (nextMatchCount === 4) { nextRankText = "👍 4등 당첨!"; nextRankColor = "#c084fc"; }
        else if (nextMatchCount === 3) { nextRankText = "👍 5등 당첨!"; nextRankColor = "#a78bfa"; }

        resultHtml += `<span style="color: ${nextRankColor}; font-weight: 700; font-size: 0.9rem;">[${nextRoundNumber}회차] ${nextMatchCount}개 일치 (${nextRankText})</span>`;
    } else {
        resultHtml += `<span style="color: #64748b; font-size: 0.85rem;">[${nextRoundNumber}회차] 추첨 전 (데이터 없음)</span>`;
    }

    resultSpan.innerHTML = resultHtml;
}