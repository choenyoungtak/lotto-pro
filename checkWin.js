function checkWin() {
    const roundSelect = document.getElementById("roundSelect");
    if (!roundSelect) return;
    
    // 선택한 회차 기준 -> 바로 다음 회차(N + 1) 당첨 확인
    const currentRound = Number(roundSelect.value);
    const targetRound = currentRound + 1;

    // N + 1회차 데이터 찾기
    const draw = lottoData.find(d => Number(d["회차"] || d.round) === targetRound);

    if (!draw) {
        alert(`선택한 회차의 다음 회차인 [${targetRound}회차] 당첨 데이터가 존재하지 않습니다.`);
        return;
    }

    // 입력한 번호 읽기
    const numbersInput = document.getElementById("numbers").value.trim();
    if (!numbersInput) {
        alert("번호를 입력해 주세요. (예: 1, 2, 3, 4, 5, 6)");
        return;
    }

    const user = numbersInput.split(",")
                             .map(n => Number(n.trim()))
                             .filter(n => !isNaN(n) && n >= 1 && n <= 45);

    if (user.length !== 6) {
        alert("1부터 45 사이의 서로 다른 번호 6개를 정확히 입력해 주세요.");
        return;
    }

    const winNumbers = draw["당첨번호"] || [];
    const bonusNumber = draw["보너스번호"];

    let hit = user.filter(n => winNumbers.includes(n)).length;
    let bonus = user.includes(bonusNumber);

    let grade = "낙첨 (꽝)";
    if (hit === 6) grade = "1등 🎉";
    else if (hit === 5 && bonus) grade = "2등 🥈";
    else if (hit === 5) grade = "3등 🥉";
    else if (hit === 4) grade = "4등";
    else if (hit === 3) grade = "5등";

    const resultDiv = document.getElementById("result");
    if (resultDiv) {
        resultDiv.innerHTML = `
            <div style="margin-top: 15px; padding: 15px; border: 1px solid #4CAF50; border-radius: 8px; background-color: #f0fff0;">
                <h3 style="margin-top: 0; color: #2e7d32;">[${targetRound}회차(다음 회차) 검증 결과]</h3>
                <p><strong>당첨 번호:</strong> ${winNumbers.join(", ")}</p>
                <p><strong>보너스 번호:</strong> ${bonusNumber}</p>
                <hr style="border: 0.5px solid #ccc; margin: 10px 0;">
                <p><strong>내가 맞춘 개수:</strong> ${hit}개 ${bonus ? "(보너스 적중!)" : ""}</p>
                <p style="font-size: 1.2em; color: #d32f2f;"><strong>최종 결과:</strong> ${grade}</p>
            </div>
        `;
    }
}