/**
 * [자동번호 추천 모듈]
 * 사용자가 1~45 사이의 무작위 로또 번호 1세트를 간편하게 자동 생성하여 확인할 수 있는 기능
 */
function autoNumber() {
    const numbers = [];
    while (numbers.length < 6) {
        const randNum = Math.floor(Math.random() * 45) + 1;
        if (!numbers.includes(randNum)) {
            numbers.push(randNum);
        }
    }
    // 오름차순 정렬
    numbers.sort((a, b) => a - b);

    const setStr = numbers.join(",");
    const resultSpanId = "auto-result-span";
    const containerId = "auto-ball-container";
    const ballsHtml = numbers.map(n => typeof createLottoBallHtml === 'function' ? createLottoBallHtml(n) : `<span class="lotto-ball">${n}</span>`).join("");

    const recommendDiv = document.getElementById("recommend");
    if (recommendDiv) {
        recommendDiv.innerHTML = `
            <div class="recommend-card">
                <div class="recommend-header"><span>🎲 간편 자동번호 생성 결과</span></div>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
                    <div class="recommend-row">
                        <span class="set-tag" style="color: #38bdf8;">[자동생성]</span>
                        <div id="${containerId}" class="lotto-ball-wrapper">${ballsHtml}</div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                            <button class="btn-inline-check" style="background: #0284c7; color: white;" onclick="sendToComprehensiveBasket('자동생성 세트', '${setStr}', '간편자동')">종합 보내기</button>
                            <button class="btn-inline-check" onclick="checkWinForNumbers('${setStr}', '${resultSpanId}', '${containerId}')">당첨 확인</button>
                            <span id="${resultSpanId}" class="result-text"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}