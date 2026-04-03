export default userTask = channel => {
    return {
        interval: null,
        Execute(freq) {
            // основной рабочий метод
            
            this.interval = setInterval(() => {
                if (this.Foo()) {
                    let v = this.Bar();
                    channel.SetValue(v);
                }
            }, 1/freq);
        },
        Cancel() {
            // код остановки таска
            if (this.interval) clearInterval(this.interval);
        },
        Foo() {
            // вспомогательный метод №1
            return Math.random() > 0.5
        },
        Bar() {
            // вспомогательный метод №2
            return Math.random();
        }
    }
}
