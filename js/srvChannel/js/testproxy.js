let a = {
    name: 'a',
    count: 0,
    incr: () => { a.count += 1; }
}
let createProxyFactory = (o) => {
    let pf = null;
    return () => {
        pf ??= new Proxy(o, {
            get: (target, prop) => {
                return target[prop];
            },
            set(obj, prop, value) {
                return false;

                obj[prop] = value;
                return true;
            }
        });
        return pf;
    }
}

let pf = createProxyFactory(a);
let proxy = pf();
proxy.incr = () =>{} 
for (let i = 0; i < 5; i++) { proxy.incr() }
console.log(a.count); 