// 전역 변수 안전 선언 (이미 선언되어 있지 않은 경우에만 초기화하여 충돌 방지)
if (typeof window.lottoData === "undefined") {
    var lottoData = [];
}

// 종합 바스켓 및 분석 완료 상태 전역 초기화 안전 선언
if (typeof window.comprehensiveBasket === "undefined") {
    window.comprehensiveBasket = [];
}

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

    // 드롭다운 값(회차)이 변경될 때마다 선택된 회차 정보 표시 및 분석 상태 리셋
    select.addEventListener("change", () => {
        displaySelectedRoundInfo();
        resetAnalysisStateOnRoundChange();
    });

    // 페이지 처음 로드 시 제일 최신 회차 번호 바로 출력
    displaySelectedRoundInfo();
}

// 회차가 변경될 때 사용자가 혼선이 없도록 분석 완료 상태와 바스켓을 초기화하는 함수
function resetAnalysisStateOnRoundChange() {
    window.analysisStatus = {
        hot: false,
        cold: false,
        trend: false,
        statistics: false,
        enhancedAiRecommend: false,
        lstm: false
    };
    
    // 종합 버튼 다시 비활성화 처리
    const totalBtn = document.getElementById("totalBtn");
    if (totalBtn) {
        totalBtn.disabled = true;
        totalBtn.style.background = "#475569";
        totalBtn.style.opacity = "0.6";
        totalBtn.style.cursor = "not-allowed";
        totalBtn.textContent = "🌟 종합 예상 결과 (모든 분석을 완료해 주세요)";
    }
    
    console.log("회차 변경으로 인해 분석 상태 및 버튼이 초기화되었습니다.");
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

// 불필요한 속성(enhancedAi 등) 유입을 원천 방지하고 6개 키만 완벽히 고정하는 정화 함수
function getSanitizedAnalysisStatus() {
    if (!window.analysisStatus) {
        window.analysisStatus = {
            hot: false,
            cold: false,
            trend: false,
            statistics: false,
            enhancedAiRecommend: false,
            lstm: false
        };
    }

    if (Object.prototype.hasOwnProperty.call(window.analysisStatus, 'enhancedAi')) {
        if (window.analysisStatus.enhancedAi) {
            window.analysisStatus.enhancedAiRecommend = true;
        }
        delete window.analysisStatus.enhancedAi;
    }

    return {
        hot: Boolean(window.analysisStatus.hot),
        cold: Boolean(window.analysisStatus.cold),
        trend: Boolean(window.analysisStatus.trend),
        statistics: Boolean(window.analysisStatus.statistics),
        enhancedAiRecommend: Boolean(window.analysisStatus.enhancedAiRecommend),
        lstm: Boolean(window.analysisStatus.lstm)
    };
}

// 중복 없이 하나로 통합된 단일 분석 완료 체크 함수
function markAnalysisComplete(moduleName) {
    if (moduleName === 'enhancedAi') {
        moduleName = 'enhancedAiRecommend';
    }

    let status = getSanitizedAnalysisStatus();
    if (Object.prototype.hasOwnProperty.call(status, moduleName)) {
        status[moduleName] = true;
    }
    window.analysisStatus = status;

    console.log(`[분석 완료] ${moduleName} 처리됨`, window.analysisStatus);

    if (typeof checkAllAnalysisComplete === "function") {
        checkAllAnalysisComplete();
    }
}

// 페이지 로드 완료 시 실행
document.addEventListener("DOMContentLoaded", loadData);