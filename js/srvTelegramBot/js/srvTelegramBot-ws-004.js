const ClassBaseService_S = require('srvService');
const { Bot } = require("grammy");

const EVENT_SYSBUS_LIST = ['all-init-stage1-set'];
const EVENT_DATABUS_LIST = ['all-data-fine-set'];
const BUS_NAMES_LIST = ['sysBus', 'logBus', 'dataBus'];

const THIS_NAME = 'telegrambot';

class TelegramBot extends ClassBaseService_S {
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: THIS_NAME, _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList('dataBus', EVENT_DATABUS_LIST);
        this.bot = new Bot("8321475067:AAEvymCuM3PIwBEswgSWo--SLGeTJ_ePIkc");

        this.EmitEvents_logger_log({level: 'INFO', msg: 'Telegram bot initialized.'});
    }
    HandlerEvents_all_init_stage1_set(_topic, _msg) {
        super.HandlerEvents_all_init_stage1_set(_topic, _msg);

        this.bot.command("start", (ctx) => ctx.reply("Welcome! Please select one of the next commands:\n/temp - show current temperature\n/light - show current light level\n/reboot X - reboot Horizon PLC{X}"));

        this.bot.command("temp", async (ctx) => {
            ctx.reply(`Temperature: ${this.ServicesState['mqtt-Temp1'].Service.Value.toFixed(1)} C`);
        });

        this.bot.command("light", async (ctx) => {
            ctx.reply(`Light level: ${this.ServicesState['mqtt-Light'].Service.Value.toFixed(3)} Lux`);
        });

        this.bot.command("reboot", async (ctx) => {
            if (ctx.match === undefined) {
                ctx.reply(`Please add a number from 4 to 7`);
                return;
            }

            const name = `plc${ctx.match}-mqtt`;

            const msg = {
                com: 'all-actuator-set',
                dest: name,
                source: THIS_NAME,            
                arg: [name],
                value: [`{"v":true}`]
            };
            this.EmitMsg('dataBus', msg.com, msg);

            setTimeout(() => {
                msg.value = [`{"v":false}`];
                this.EmitMsg('dataBus', msg.com, msg);
                ctx.reply(`PLC${ctx.match} successfully rebooted!`);
            }, 5000)

            
        });

        this.bot.start();
    }
    /**
     * @method
     * @description Запускает событие proxymodbus-msg-get
     * @returns msg         - отправляемое сообщение
     */
    HandlerEvents_all_data_fine_set(_topic, _msg) {
        /*this.#_SubChannels.forEach(channel => {
            if (channel.chName == _msg.arg[0]) {
                let retVal = [];
                Object.keys(_msg.value[0]).forEach(key => {
                    if (channel.ret.includes(key)) {
                        retVal.push(_msg.value[0][key]);
                    }
                });
                const msg = {payload: {
                    dest: channel.node.name,
                    com: 'chio-output',
                    arg: channel.ret,
                    value: retVal
                    },
                    topic: channel.chName
                };
                channel.node.send(msg);
            }
        });*/
    }
    
}

module.exports = TelegramBot;