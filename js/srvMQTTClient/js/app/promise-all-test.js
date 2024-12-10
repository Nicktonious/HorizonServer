const connect = async (i) => {
    return new Promise((res, rej) => {
        let t = 100*Math.round(Math.random()*10);
        setTimeout(() => {
            try {
                if (i == 2) 
                    throw new Error('e');
                else {
                    console.log(`${i}. t = ${t}`);
                    res(t);
                }
            } catch (e) {
                res(e);
            }
        }, t);
    });
}
const establishConnections = (n) => {
    let range = [...Array(n).keys()];
    return range.map(i => connect(i));
}
const getT = () => new Date().getTime();

async function main() {
    let t1 = getT();
    const conn_promise_list = establishConnections(5);
    const ready_connections = await Promise.all(conn_promise_list);
    console.log(ready_connections);
    console.log(ready_connections.find(_c => _c instanceof Error));
    console.log(getT() - t1);
}

main()