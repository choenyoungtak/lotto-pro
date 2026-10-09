// 전역 변수 선언
var lottoData = [];

async function loadData() {
    try {
        const response = await fetch("lottoData.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        lottoData = await response.json();
        console.log("로또 데이터 로드 완료:", lottoData.length, "개 회차");
        
        // 회차 선택 드롭다운 생성 및 이벤트 연결
        populateRounds();
    } catch (error) {
        console.error("데이터 로드 실패:", error);
    }
}

function populateRounds() {
    const select = document.getElementById("roundSelect");
    if (!select) return;

    select.innerHTML = "";
    lottoData.forEach(draw => {
        let option = document.createElement("option");
        const roundNum = draw["회차"] || draw.round; 
        option.value = roundNum;
        option.textContent = roundNum + "회";
        select.appendChild(option);
    });

    // 드롭다운 값(회차)이 변경될 때마다 선택된 회차 정보 표시
    select.addEventListener("change", displaySelectedRoundInfo);

    // 페이지 처음 로드 시 제일 최신 회차 번호 바로 출력
    displaySelectedRoundInfo();
}

// 선택된 회차의 당첨 번호 및 보너스 번호를 화면에 표시하는 함수
function displaySelectedRoundInfo() {
    const select = document.getElementById("roundSelect");
    const resultDiv = document.getElementById("result");
    if (!select || !resultDiv || lottoData.length === 0) return;

    const selectedRound = Number(select.value);
    const draw = lottoData.find(d => Number(d["회차"] || d.round) === selectedRound);

    if (draw) {
        const winNumbers = draw["당첨번호"] || draw.numbers || [];
        const bonusNumber = draw["보너스번호"] || draw.bonus;

        resultDiv.innerHTML = `
            <div style="margin-top: 15px; padding: 12px; border: 1px solid #2196F3; border-radius: 8px; background-color: #e3f2fd;">
                <h3 style="margin: 0 0 8px 0; color: #1565c0;">[ ${selectedRound}회차 당첨 번호 ]</h3>
                <p style="font-size: 1.1em; margin: 0; font-weight: bold; color: #0d47a1;">
                    당첨번호: ${winNumbers.join(", ")} <span style="color: #d32f2f; margin-left: 10px;">(보너스: ${bonusNumber})</span>
                </p>
            </div>
        `;
    }
}

// 페이지 로드 완료 시 실행
document.addEventListener("DOMContentLoaded", loadData);