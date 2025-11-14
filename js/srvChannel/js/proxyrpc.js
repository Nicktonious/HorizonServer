import { default as EventEmitter2 } from "eventemitter2";

class ImplementRPC {

    Invoke() {

    }
}
class Channel extends ImplementRPC {
    #name = '';
    constructor(name) {
        super();
        this._Name = name;
    }
    get Value() { return this._Value }
    set Value(v) { this._Value = v; }

    SetValue(v) {
        console.log(`SetValue(${v})`);
    }
    GetValue() {
        console.log(`GetValue() -> ${v}`);
    }

    SubOnEventBus(bus) {
        bus.onAny((eventName, ...args) => {
            if (eventName.includes(this.#name)) {
                let { com, arg, value } = args[0];
                let [methodName] = arg;
                // value - args
            }
        });
    }
}
let ee = new EventEmitter2();
ee.
let ch = new Channel(`channel-1`);
console.log(JSON.stringify(ch));
