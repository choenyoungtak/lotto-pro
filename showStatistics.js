function showStatistics(){

    const freq=
    getFrequency();

    const labels=[];
    const values=[];

    for(let i=1;i<=45;i++){

        labels.push(i);
        values.push(freq[i]);

    }

    if(chart){

        chart.destroy();

    }

    chart=
    new Chart(
    document.getElementById("chart"),
    {
        type:"bar",
        data:{
            labels:labels,
            datasets:[
            {
                label:"출현횟수",
                data:values
            }]
        }
    }
    );
}