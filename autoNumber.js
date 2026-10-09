function autoNumber(){

    const arr=[];

    while(arr.length<6){

        let n=
        Math.floor(Math.random()*45)+1;

        if(!arr.includes(n)){
            arr.push(n);
        }
    }

    arr.sort((a,b)=>a-b);

    document.getElementById("numbers").value=
    arr.join(",");
}