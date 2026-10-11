function showStatistics() {
    const freq = getFrequency();
    if (!freq) return;

    const labels = [];
    const values = [];

    for (let i = 1; i <= 45; i++) {
        labels.push(i);
        values.push(freq[i]);
    }

    // 전역 변수 chart가 존재하는 경우 기존 차트 파기
    if (typeof chart !== "undefined" && chart) {
        chart.destroy();
    }

    const chartCanvas = document.getElementById("chart");
    if (chartCanvas && typeof Chart !== "undefined") {
        chart = new Chart(
            chartCanvas,
            {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "출현횟수",
                        data: values
                    }]
                }
            }
        );
    }

    // [중요] 통계 분석 모듈 완료 상태 체크 실행
    if (typeof markAnalysisComplete === "function") {
        markAnalysisComplete('statistics');
    }
}