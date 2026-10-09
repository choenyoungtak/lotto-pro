function coldRecommend(){

    const freq=
    getFrequency();

    let list=[];

    for(let i=1;i<=45;i++){

        list.push({
            n:i,
            c:freq[i]
        });
    }

    list.sort(
    (a,b)=>a.c-b.c
    );

    let result=
    list.slice(0,6)
    .map(v=>v.n)
    .sort((a,b)=>a-b);

    showRecommend(
    "COLD 추천",
    result
    );
}