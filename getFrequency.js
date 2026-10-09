function getFrequency() {
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

    // 2. 선택한 회차 이하(N회차 포함 및 이전 회차) 데이터만 필터링
    const filteredData = lottoData.filter(draw => {
        const round = Number(draw["회차"] || draw.round);
        return !isNaN(round) && round <= selectedRound;
    });

    if (filteredData.length === 0) {
        alert(`선택한 [${selectedRound}회차] 이전 데이터가 없습니다.`);
        return;
    }

    // 3. 해당 시점 기준 출현 빈도 계산
    const freq = new Array(46).fill(0);
    filteredData.forEach(draw => {
        const numbers = draw["당첨번호"] || draw.numbers;
        if (Array.isArray(numbers)) {
            numbers.forEach(num => {
                if (num >= 1 && num <= 45) {
                    freq[num]++;
                }
            });
        }
    });

    // 4. 번호와 빈도를 객체 배열로 정렬
    const numFreqList = [];
    for (let i = 1; i <= 45; i++) {
        numFreqList.push({ num: i, count: freq[i] });
    }

    // 출현 빈도 기준 내림차순 정렬 (자주 나온 순)
    numFreqList.sort((a, b) => b.count - a.count);

    // 5. 정밀 통계 조합 추출
    // - 최다 출현 번호 TOP 6
    const top6 = numFreqList.slice(0, 6).map(item => item.num).sort((a, b) => a - b);
    
    // - 최소 출현(차가운 번호) TOP 6
    const bottom6 = numFreqList.slice(-6).map(item => item.num).sort((a, b) => a - b);
    
    // - 상위 12개 중 균형 조합 6개 (짝수 순위 조합)
    const balanced6 = [
        numFreqList[0].num, numFreqList[2].num, numFreqList[4].num,
        numFreqList[6].num, numFreqList[8].num, numFreqList[10].num
    ].sort((a, b) => a - b);

    const statSets = [top6, bottom6, balanced6];

    // 6. showRecommend를 호출하여 3개 세트 및 [당첨 확인] 버튼 출력
    if (typeof showRecommend === "function") {
        showRecommend(`📊 [${selectedRound}회차 기준] 정밀 통계 분석 추천 세트`, statSets);
    } else {
        alert("showRecommend.js 파일이 올바르게 로드되지 않았습니다.");
    }
}