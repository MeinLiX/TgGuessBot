//'use strict';
const Telegraf = require('telegraf');
const bot = new Telegraf("769141946:AAEIhwSEUdDn3mSWPqSqXL8eIBuOFlmRzvo");
const uuidv4 = require('uuid/v4');



bot.catch((err, ctx) => {    //////////////////////////////////////////ERROR
    let userID;
    if (ctx.message) {
        userID = ctx.message.chat.id;
        ctx.reply("Error!Write /start");
        state_users[userID] = {
            nickname: this.nickname,
            roomID: "",
            password: 0,
            st: 0,
        }
    }
    console.log("\n Ooops :\n", err);

});
bot.use((ctx, next) => {      //MESSAGE LOG!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!LLLLOOOOGGGG
    let userID;
    if (ctx.message)
        userID = ctx.message.chat.id;

    if (ctx.message) {
        console.log(ctx.message);
    } else if (ctx.editedMessage) {
        console.log(ctx.editedMessage);
        ctx.reply("Stop editing message!");
    } else if (ctx.update) {
        console.log(ctx.update.callback_query);
    }
    console.log("\n\t***\t\n")
    if (!state_users[userID]) {
        state_users[userID] = {
            nickname: "Guest",
            roomID: "",
            password: 0,
            st: 0,
        }
    }
    return next();
});
bot.on(['music', 'sticker'], (ctx) => ctx.reply(':3'));///////answer///music///stiker//////





let LobbyMap = new Map();
let state_users =
{
    nickname: "Guest",
    roomID: "",
    password: 0,
    st: 0,
};

class lobby {                                                                   //START class lobby ***
    constructor(ID, PASS = 0, COMPUTER = false) {
        this.id = ID;
        this.settings =
            {
                computer: COMPUTER,
                private: (PASS == 0) ? false : true,
                password: PASS,
            };
        this.users = [];
        if (COMPUTER == true) {
            this.adduser(0, this.settings.password);
        }
    };
    adduser(userID, PASS = 0) {                                                 //adduser
        if (PASS != this.settings.password || this.users.some(x => x.id === userID) || this.users.length == 2) return 0;
        this.users.push({ id: userID, secret_num: "", current_num: "" });
    };
    win(audit) {                                                                //win
        return (audit.SameNum == 4 && audit.SameColumnNum == 4) ? 1 : 0;
    }
    play(msg) {                                                                 //PLAY
        if (!isTRUEnum(msg))
            return "Incorrect entry!\nTry again!";
        else if (this.settings.computer) {
            this.users[1].current_num = msg;
            let audit = this.audit_num(this.users[1].current_num);
            let ans = "Your num:" + msg + "\nSame:" + audit.SameNum + "\nWith same position:" + audit.SameColumnNum + "\n\n";
            if (this.win(audit)) {
                destroyLobby(this);
                return ans + "Very good, you won!";
            }
            else {
                return ans + "Try again!";
            }
        }
    }
    start(ctx) {                                                                //START
        console.log(this.users.length + "\n" + this.settings.computer);
        if (this.users.length == 2) {
            if (this.settings.computer) {
                this.users[0].secret_NUM = GetRandomSecretNum();
                state_users[this.users[1].id].st = 505;
                ctx.reply("Try to guess the number!");
            }
        }
    }
    audit_num(num, secretNUM = this.users[0].secret_NUM) {                      //audit_num
        let _num = isNum(num).toString();
        let _secretNUM = isNum(secretNUM).toString();
        var audit =
        {
            SameNum: 0,
            SameColumnNum: 0,
        };
        for (let i = 0; i < 4; ++i) {
            for (let n = 0; n < 4; ++n)
                if (_num[i] == _secretNUM[n])
                    ++audit.SameNum;
            if (_num[i] == _secretNUM[i])
                ++audit.SameColumnNum;
        }
        return audit;
    };
};                                                                               //END class lobby***

function createLobbby(userID, PASS = 0, COMPUTER = false) {
    let ID = uuidv4();
    let nlb = new lobby(ID, PASS, COMPUTER);
    LobbyMap.set(ID, nlb);
    state_users[userID].roomID = ID;
    state_users[userID].password = PASS;
    return nlb;
};
function destroyLobby(myLobby) {
    if (myLobby.id) {
        if (myLobby.settings.computer) {
            state_users[myLobby.users[1].id].lobbyID = "";
            state_users[myLobby.users[1].id].password = 0;
            state_users[myLobby.users[1].id].st = 0;
        }
        LobbyMap.delete(lobby.id);
    }
}

function GetLobby(lobbyID) {
    return LobbyMap.get(lobbyID);
}




async function loading(ctx) {
    let msg = await ctx.reply("Loading.. 🔑🔑➖➖➖➖🔒");
    sleep(100);
    await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, msg.message_id, "Loading.. 🔑🔑🔑🔑➖➖🔒");
    sleep(100);
    await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, msg.message_id, "Loading.. 🔑🔑🔑🔑🔑🔑🔒");
    sleep(100);
    await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, msg.message_id, "Loading.. Complete... 🔓");
    sleep(600);
    await ctx.deleteMessage(msg.message_id);
};
function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
};
function GetRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
function GetRandomSecretNum() {
    const symbols = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

    let result = "";

    for (let i = 0; i < 4; ++i) {
        let x = GetRandomInt(0, symbols.length - 1);
        result += symbols[x];

        symbols.splice(x, 1);
    }

    return result;
};
function isNum(num) {
    return /\d+/.test((num)) ? +num : 0;
};
function isTRUEnum(num) {
    return isNum(num).toString().split("").reduce((a, c) => (a.add(c), a), new Set()).size === 4;
};



bot.on('callback_query', async (ctx, next) => { /////////////////////// ���������
    let userID = ctx.from.id;
    if (state_users[userID].st == 0) {
        //await loading(ctx);
        let data = ctx.update.callback_query.data;
        if (data == "menu") {
           await ctx.editMessageText(`${state_users[userID].nickname}, choose the button what you need..`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '❌Join to Random lobby❌',
                                callback_data: 'Join_to_random_lobby'
                            }
                        ],
                        [
                            {
                                text: '❌Create lobby❌',
                                callback_data: 'Create_lobby'
                            },
                            {
                                text: '❌List lobby\'s❌',
                                callback_data: 'List_lobbys'
                            }
                        ],
                        [
                            {
                                text: '✅Start Practic✅',
                                callback_data: 'Try_start_practic'
                            }
                        ]
                    ]
                }
            });
        }


        if (data == 'Join_to_random_lobby') {
            await ctx.editMessageText(`Not release...`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Back',
                                callback_data: 'menu'
                            }
                        ]
                    ]
                }
            });
        }
        if (data == 'Create_lobby') {
            await ctx.editMessageText(`Not release...`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Back',
                                callback_data: 'menu'
                            }
                        ]
                    ]
                }
            });
        }
        if (data == 'List_lobbys') {
            await ctx.editMessageText(`Not release...`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Back',
                                callback_data: 'menu'
                            }
                        ]
                    ]
                }
            });
        }
        if (data == 'Try_start_practic') {
            await ctx.editMessageText(`Are you ready?`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Start',
                                callback_data: 'Start_practic'
                            }
                        ],
                        [
                            {
                                text: 'Back',
                                callback_data: 'menu'
                            }
                        ]
                    ]
                }
            });
        }
        if (data == 'Start_practic') {
            await ctx.editMessageText("Computer Calculate..!");
            let myLobby = createLobbby(userID, GetRandomInt(1, 999999), true);
            myLobby.adduser(userID, state_users[userID].password)
            await ctx.editMessageText("Computer picked the number!");
            myLobby.start(ctx);
        }
    }
    ctx.answerCbQuery();
    return next();
});


bot.start(async (ctx, next) => {
    let userID = ctx.message.chat.id;
    let msg = ctx.message.text;
    if (state_users[userID].st == 5) {

    } else if (state_users[userID].st == 0) {
        ctx.reply(`Welcome, ${state_users[userID].nickname}.`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'menu', callback_data: 'menu' }]
                ]
            }
        })
    }
    return next();
});

bot.help((ctx, next) => {   //HELP

    let userID = ctx.message.chat.id;
    if (state_users[userID].st == 0) {
        let msg = ctx.message.text;
        if (msg.length > 5 && userID != 319877134) {
            ctx.telegram.sendMessage(319877134, msg.slice(5, msg.length) + "\n\n����������(userID)\n" + ctx.message.chat.first_name + "(" + userID + ")");
            ctx.reply("������ �� ���������!\n\n���� ����������� ������� ���:\n" + msg.slice(5, msg.length));
        } else if (userID == 319877134 && msg.length > 15) {
            ctx.telegram.sendMessage(msg.slice(6, 15), msg.slice(16, msg.length));
            ctx.reply("������� ���� �������:\n" + msg.slice(16, msg.length) + "\n������������(userID):" + msg.slice(6, 15));
        } else if (userID == 319877134 && msg.length < 16) {
            ctx.reply("Hey Admin!");
        } else {
            ctx.reply("���� � ��� ������� ������� ��� ��������� �������� �� � ���� ����(������� ���������):\n\n/help \"���������\" ");
        }
    }
    return next();
});


bot.use((ctx, next) => {
    if (ctx.message) {
        let userID = ctx.message.chat.id;
        let msg = ctx.message.text;
        if (msg == "/cheat") {
            if (state_users[userID].st == 505)
                ctx.reply(GetLobby(state_users[userID].roomID).users[0].secret_NUM);
        } else if (msg == "/surrender") {
            if (state_users[userID].st == 505) {
                let myLobby = GetLobby(state_users[userID].roomID);
                ctx.reply("You surrendered. \nSecret number: " + myLobby.users[0].secret_NUM, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Go to menu', callback_data: 'menu' }]
                        ]
                    }
                });
                destroyLobby(myLobby);
            }
        }
        else if (state_users[userID].st == 401) { //Change Name!
            msg = msg.slice(0, msg.length);
            state_users[userID].nickname = msg;
            ctx.reply(`Now your nickname: ${state_users[userID].nickname}!\nGood Luck!`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Go to menu', callback_data: 'menu' }]
                    ]
                }
            });
            state_users[userID].st = 0;
        }
        if (state_users[userID].st == 505) { //Practic mode!
            let myLobby = GetLobby(state_users[userID].roomID);
            let ans = myLobby.play(msg);
            if (ans.indexOf('won') == -1) ctx.reply(ans);
            else ctx.reply(ans, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Go to menu', callback_data: 'menu' }]
                    ]
                }
            });
        }
    }
    return next();
});
bot.command("change_name", (ctx, next) => {
    let userID = ctx.message.chat.id;
    if (state_users[userID].st == 0) {
        ctx.reply("Enter Your new nickname:");
        state_users[userID].st = 401;
    }
    return next();
});
bot.command("test", async (ctx, next) => {
    let userID = ctx.message.chat.id;
    let msg = "/start " + uuidv4() + "13372";
    if (state_users[userID].st == 0) {
        await ctx.reply(msg + "\n" + msg.length);
        await ctx.reply(msg.slice(7, 7 + 36))
        await ctx.reply(msg.slice(7 + 36 + 1, msg.length))
        await loading(ctx);
    }
    return next();
});

bot.launch();

/*
 *  ctx.telegram.sendMessage(ida, `Game STARTED `+ states[id].name );
 *
 *  state 0 default.
 *
 *  state 401 Change Name.
 *       \nEnter /Change_Name for change nickname.
 *
 *  state 505 Practic mode!
 *
 *
 * */