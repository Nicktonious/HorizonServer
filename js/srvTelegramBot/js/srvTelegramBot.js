const ClassBaseService_S = require('srvService');
const { Bot } = require("grammy");

const EVENT_SYSBUS_LIST = ['all-init-stage1-set'];
const EVENT_DATABUS_LIST = ['all-ch-alarm'];
const BUS_NAMES_LIST = ['sysBus', 'logBus', 'dataBus'];

const THIS_NAME = 'telegrambot';

class TelegramBot extends ClassBaseService_S {
    #_CurrTimeout;
    #_plcCommand;
    #_plcReboot;
    #_subContexts;
    #_Keyboard;
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }, { token }) {
        super({ _name: THIS_NAME, _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList('dataBus', EVENT_DATABUS_LIST);
        this.bot = new Bot( token );
        this.#_CurrTimeout = 0;
        this.#_plcCommand = 0;
        this.#_plcReboot = 0;
        this.#_subContexts = [];

        this.EmitEvents_logger_log({level: 'INFO', msg: 'Telegram bot initialized.'});
    }
    HandlerEvents_all_init_stage1_set(_topic, _msg) {
        super.HandlerEvents_all_init_stage1_set(_topic, _msg);

        this.#_Keyboard = new (require("grammy").Keyboard)()
            .text("/start")
            .text("/temp")
            .text("/light").row()
            .text("/sub")
            .text("/unsub").persistent();

        this.bot.command("start", (ctx) => {
            ctx.reply("Welcome! Please select one of the next commands:\n\nPLC Control\n/on - turn on Horizon PLC (uses submenu)\n/off - turn off Horizon PLC (uses submenu)\n/reboot - reboot Horizon PLC (uses submenu)\n\nChannels\n/list - show all available channels\n/val {channel name} - show current value of selected channel\n/temp - show current temperature\n/light - show current light level\n\nSubscribtion\n/sub - subscribe to channel zone changing events\n/unsub - unsubscribe from these events", {reply_markup: this.#_Keyboard,});
        });

        this.bot.command("temp", async (ctx) => {
            ctx.reply(`Temperature: ${this.ServicesState['adam-Temp1'].Service.Value.toFixed(1)} C`);
        });

        this.bot.command("light", async (ctx) => {
            ctx.reply(`Light level: ${this.ServicesState['adam-Light'].Service.Value.toFixed(3)} Lux`);
        });

        this.bot.command(["on","off","reboot"], async (ctx) => {
            clearTimeout(this.#_CurrTimeout);
            this.#_CurrTimeout = setTimeout(() => {
                this.#_plcCommand = 0;
                ctx.reply("Command await expired.")
            },10000);

            switch (ctx.update.message.text) {
                case '/on':
                    this.#_plcCommand = 1;
                    break;
                case '/off':
                    this.#_plcCommand = 2;
                    break;
                case '/reboot':
                    this.#_plcCommand = 3;
                    break;
                default:
                    this.#_plcCommand = 0;
                    break;
            }
            ctx.reply(`Please select PLC "${ctx.update.message.text}":\n/4\n/5\n/6\n/7`);
        });

        this.bot.command(["4", "5", "6", "7"], async(ctx) => {
            const name = `plc${ctx.update.message.text[1]}-mqtt`;

            const msg = {
                com: 'all-actuator-set',
                dest: name,
                source: THIS_NAME,            
                arg: [name],
                value: [0]
            };

            if (ctx.update.message.text[1] == this.#_plcReboot) {
                ctx.reply(`PLC${ctx.update.message.text[1]} is currently rebooting. Cannot process new command.\nSelect PLC command first:\n/on\n/off\n/reboot`);
                this.#_plcCommand = 0;
                clearTimeout(this.#_CurrTimeout);
            }
            else {
                switch (this.#_plcCommand) {
                    case 1:
                        this.#_plcCommand = 0;
                        clearTimeout(this.#_CurrTimeout);
                        msg.value = [`{"v":false}`];
                        this.EmitMsg('dataBus', msg.com, msg);
                         ctx.reply(`PLC${ctx.update.message.text[1]} turned on!`);
                        break;
                    case 2:
                        this.#_plcCommand = 0;
                        clearTimeout(this.#_CurrTimeout);
                        msg.value = [`{"v":true}`];
                        this.EmitMsg('dataBus', msg.com, msg);
                         ctx.reply(`PLC${ctx.update.message.text[1]} turned off!`);
                        break;
                    case 3:
                        this.#_plcCommand = 0;
                        clearTimeout(this.#_CurrTimeout);
                        this.#_plcReboot = ctx.update.message.text[1];
                        msg.value = [`{"v":true}`];
                        this.EmitMsg('dataBus', msg.com, msg);
                        setTimeout(() => {
                            msg.value = [`{"v":false}`];
                            this.EmitMsg('dataBus', msg.com, msg);
                            this.#_plcReboot = 0;
                            ctx.reply(`PLC${ctx.update.message.text[1]} successfully rebooted!`);
                        }, 5000);
                        break;            
                    default:
                        this.#_plcCommand = 0;
                        clearTimeout(this.#_CurrTimeout);
                        ctx.reply(`Select PLC command first:\n/on\n/off\n/reboot`);
                        break;
                }
            }
        });

        this.bot.command("list", async(ctx) => {
            let response = '';
            this.ServicesState['dm'].Service.Channels.forEach(channel => {
                response += `${channel.Name}\n`;
            });
            ctx.reply(response);
        });

        this.bot.command("val", async(ctx) => {
            let channel = this.ServicesState['dm'].Service.Channels.find(ch => ch.Name == ctx.match);

            if (channel == undefined) {
                ctx.reply(`Cannot find channel with name ${ctx.match}`);
            }
            else {
                ctx.reply(`Value: ${channel.Value.toFixed(3)} ${channel.ChMeas}`);
            }
        });

        this.bot.command("sub", async(ctx) => {
            if (this.#_subContexts.indexOf(ctx.chatId) === -1) {
                this.#_subContexts.push(ctx.chatId);
                ctx.reply(`Successfully subbed to events.\nTemperature: ${this.ServicesState['adam-Temp1'].Service.Value.toFixed(3)} C\nLight level: ${this.ServicesState['adam-Light'].Service.Value.toFixed(3)} Lux`);
            }
            else {
                ctx.reply('Already subscribed.');
            }
            
        });

        this.bot.command("unsub", async(ctx) => {
            this.#_subContexts.splice(this.#_subContexts.indexOf(ctx.chatId), 1);
            ctx.reply('Unsubscribed.');
        });

        this.bot.start();
    }
    /**
     * @method
     * @description Запускает событие proxymodbus-msg-get
     * @returns msg         - отправляемое сообщение
     */
    HandlerEvents_all_ch_alarm(_topic, _msg) {
        if (['adam-Temp1', 'adam-Light'].includes(_msg.arg[0])) {
            const getCurrZoneName = o => Object.entries(o).find(([_, isActive]) => isActive)?.[0];
            this.#_subContexts.forEach(ctxId => {
                this.bot.api.sendMessage(ctxId, `Alert!\n${_msg.arg[0]} changed zone to ${getCurrZoneName(_msg.value[0])}!\nCurrent value: ${this.ServicesState[_msg.arg[0]].Service.Value.toFixed(3)} ${this.ServicesState[_msg.arg[0]].Service.ChMeas}`);
            })
        }
    }    
}

module.exports = TelegramBot;