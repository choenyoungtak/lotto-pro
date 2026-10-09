function trendRecommend() {
    if (!lottoData || lottoData.length === 0) {
        alert("로또 데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        return;
    }

    // 1. 선택된 회차 가져오기
    const roundSelect = document.getElementById("roundSelect");
    if (!roundSelect) {
        alert("회차 선택 드롭다운을 찾을 수 없습니다.");
        return;
    }

    const selectedRound = Number(roundSelect.value);
    if (!selectedRound || isNaN(selectedRound)) {
        alert("선택된 회차 정보를 확인할 수 없습니다.");
        return;
    }

    // 2. 선택한 회차 이하(N회차 포함 및 이전 회차) 데이터 필터링
    const filteredData = lottoData.filter(draw => {
        const round = Number(draw["회차"] || draw.round);
        return !isNaN(round) && round <= selectedRound;
    });

    if (filteredData.length === 0) {
        alert(`선택한 [${selectedRound}회차] 이전 데이터가 없습니다.`);
        return;
    }

    // 3. 선택한 회차 기준 가장 최근 30회차 데이터 추출
    const recent30 = filteredData.slice(0, 30);

    // 4. 최근 30회차 동안의 출현 빈도 계산
    const freq = new Array(46).fill(0);
    recent30.forEach(draw => {
        const numbers = draw["당첨번호"] || draw.numbers;
        if (Array.isArray(numbers)) {
            numbers.forEach(num => {
                if (num >= 1 && num <= 45) {
                    freq[num]++;
                }
            });
        }
    });

    // 5. 출현 빈도를 가중치로 설정 (최근에 자주 나온 번호일수록 확률 상승)
    const weights = new Array(46).fill(0);
    for (let i = 1; i <= 45; i++) {
        weights[i] = freq[i] + 1; // 0회 출현 번호도 최소 가중치 1 부여
    }

    // 6. 가중치 기반 최근추세 추천 5세트 생성
    const sets = [];
    let attempts = 0;

    while (sets.length < 5 && attempts < 1000) {
        attempts++;
        const selected = generateWeightedNumbers(weights);

        // 중복 세트 방지
        const setStr = selected.join(",");
        if (!sets.some(s => s.join(",") === setStr)) {
            sets.push(selected);
        }
    }

    // 7. showRecommend 호출하여 화면에 결과 및 [당첨 확인] 버튼 출력
    if (typeof showRecommend === "function") {
        showRecommend(`📈 [${selectedRound}회차 기준 최근 30회] 최근추세 추천 (5세트)`, sets);
    } else {
        alert("showRecommend.js 파일이 올바르게 로드되지 않았습니다.");
    }
}

// 가중치 기반 무작위 추출 함수 (자주 나온 번호일수록 우선 선정)
function generateWeightedNumbers(weights) {
    const numbers = [];
    const available = Array.from({ length: 45 }, (_, i) => i + 1);
    const currentWeights = [...weights];

    while (numbers.length < 6) {
        let totalWeight = 0;
        for (let i = 1; i <= 45; i++) {
            if (available.includes(i)) totalWeight += currentWeights[i];
        }

        let random = Math.random() * totalWeight;
        for (let num of available) {
            random -= currentWeights[num];
            if (random <= 0) {
                numbers.push(num);
                available.splice(available.indexOf(num), 1);
                break;
            }
        }
    }

    return numbers.sort((a, b) => a - b);
}