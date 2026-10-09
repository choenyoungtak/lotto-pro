let lottoData = [];
let chart;

async function loadData() {
    const response = await fetch("lottoData.json");
    lottoData = await response.json();
    populateRounds();
}

function populateRounds() {
    const select = document.getElementById("roundSelect");
    
    // select 요소가 존재하지 않을 때 발생하는 오류 방지
    if (!select) return;

    select.innerHTML = ""; // 기존 옵션 초기화 (필요시)

    lottoData.forEach(draw => {
        let option = document.createElement("option");

        // 'round' 대신 JSON 키인 '회차'를 사용하도록 수정
        option.value = draw["회차"];
        option.textContent = draw["회차"] + "회";

        select.appendChild(option);
    });
}

// 페이지가 로드될 때 loadData 함수를 실행하도록 이벤트 등록
document.addEventListener("DOMContentLoaded", loadData);