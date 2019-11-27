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
            lobbyID: "",
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
        console.log(ctx.update);
    }
    console.log("\n\t***\t\n")
    if (!state_users[userID] && ctx.message) {
        state_users[userID] = {
            nickname: ctx.message.from.first_name,
            lobbyID: "",
            password: 0,
            st: 0,
        }
    }

    return next();
});

bot.on(['music', 'sticker'], (ctx) => ctx.reply(':3'));///////answer///music///stiker//////





let LobbyMap = new Map();
let state_users = //exampleS
{
    nickname: "Guest",
    lobbyID: "",
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
        return 1;
    };
    win(audit) {                                                                //win
        return (audit.SameNum == 4 && audit.SameColumnNum == 4) ? 1 : 0;
    }
    start(ctx) {                                                                //START
        if (this.users.length == 2) {
            if (this.settings.computer) {
                this.users[0].secret_NUM = GetRandomSecretNum();
                state_users[this.users[1].id].st = 505;
                ctx.reply("Try to guess the number!");
            } else {
                let userID = ctx.message.chat.id;
                let msg = ctx.message.text;
                let { ans, opp } = this.setsecretnum(userID, msg);



                if (this.users[0].secret_num != "" && this.users[1].secret_num != "") {
                    state_users[this.users[0].id].st = 606;
                    state_users[this.users[1].id].st = 606;

                    ctx.telegram.sendMessage(this.users[0].id, "Start game!\nGuess the enemy number!");
                    ctx.telegram.sendMessage(this.users[1].id, "Start game!\nEnemy move!");
                } else ctx.reply(ans);

            }
        }
    }

    setsecretnum(ID, msg) {
        if (!isTRUEnum(msg)) {
            if (this.users[0].id == ID)
                this.users[0].secret_num = "";
            if (this.users[1].id == ID)
                this.users[1].secret_num = "";
            return {
                ans: "Incorrect entry!\nTry again!",
                opp: ""
            };
        }

        if (this.users[0].id == ID)
            this.users[0].secret_num = msg;

        if (this.users[1].id == ID)
            this.users[1].secret_num = msg


        return { ans: "If you would like to change your number, please send it to me again\nYour secret number:" + msg + "\n\nWait enemy...", opp: "" };

    }
    play(msg, useID = null) {                                                                 //PLAY
        if (!isTRUEnum(msg))
            return { ans: "Incorrect entry!\nTry again!", opp: "" };
        else if (this.settings.computer) {
            state_users[this.users[1].id].id = 505;
            this.users[1].current_num = msg;
            let audit = this.audit_num(this.users[1].current_num);
            let ans = "Your num:" + msg + "\nSame:" + audit.SameNum + "\nWith same position:" + audit.SameColumnNum + "\n\n";
            if (this.win(audit)) {
                destroyLobby(this);
                return {
                    ans: ans + "Very good, you won!",
                    opp: ""
                };
            } else {
                return {
                    ans: ans + "Try again!",
                    opp: ""
                };
            }
        }


        else if (this.users.length == 2 && this.users[0].secret_num != "" && this.users[1].secret_num != "") {
            state_users[this.users[0].id].id = 606;
            state_users[this.users[1].id].id = 606;
            let audit;
            if (this.users[0].current_num == "" && this.users[0].id == useID) {
                this.users[0].current_num = msg;
                audit = this.audit_num(this.users[0].current_num, this.users[1].secret_num);
                this.users[1].current_num = "";
            } else if (this.users[1].current_num == "" && this.users[1].id == useID) {
                this.users[1].current_num = msg;
                audit = this.audit_num(this.users[1].current_num, this.users[0].secret_num);
                this.users[0].current_num = "";
            } else return { ans: "Wait, enemy move!" }

            let ans = "Your num:" + msg + "\nSame:" + audit.SameNum + "\nWith same position:" + audit.SameColumnNum + "\n\n";
            if (this.win(audit)) {
                destroyLobby(this);
                return {
                    ans: ans + "Very good, you won!",
                    opp: "Your opponent guessed the number!"
                };
            } else {
                return {
                    ans: ans + "Try again!\nIf your opponent doesn't guess your number c:",
                    opp: "The time has come!\nGuess the number."
                };
            }
        }
        else if (this.users.length == 2) {
            return {
                ans: "Wait..your opponent's move",
                opp: ""
            };
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
    console.log("createLobbby");
    if (state_users[userID].st != 0) return undefined;
    let ID = uuidv4();
    let nlb = new lobby(ID, PASS, COMPUTER);
    LobbyMap.set(ID, nlb);
    if (!COMPUTER) {
        nlb.adduser(userID);
        state_users[userID].st = 604;
    }
    state_users[userID].lobbyID = ID;
    state_users[userID].password = PASS;
    console.log("createLobbby" + nlb);
    return nlb;
};

function destroyLobby(myLobby) {
    if (myLobby.id) {
        if (myLobby.settings.computer) {
            state_users[myLobby.users[1].id].lobbyID = "";
            state_users[myLobby.users[1].id].password = 0;
            state_users[myLobby.users[1].id].st = 0;
        } else {
            for (i = 0; i < 2; i++) {
                state_users[myLobby.users[i].id].lobbyID = "";
                state_users[myLobby.users[i].id].password = 0;
                state_users[myLobby.users[i].id].st = 0;
            }
        }
        LobbyMap.delete(lobby.id);
    }
}

function GetLobby(lobbyID) {
    res = LobbyMap.get(lobbyID);
    return res;
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

/* ***           NUMBER FN                   *** */
function GetRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
function GetRandomSecretNum() {
    const symbols = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

    let result = "";

    for (let i = 0; i < 4; ++i) {
        let x;
        if (i == 0) x = GetRandomInt(1, symbols.length - 1);
        else x = GetRandomInt(0, symbols.length - 1);
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



bot.on('inline_query', ctx => {
    if (ctx.update.inline_query.query == "invite" && state_users[ctx.update.inline_query.from.id].st == 0) {
        return ctx.answerInlineQuery([
            {
                type: "article",
                id: ctx.update.inline_query.id,
                title: "Create and invite to the lobby",
                description: "Invite a friend to play against each other.",
                input_message_content: {
                    message_text: "Want to play a game with me?"
                },
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Accept the invitation",
                                url: "https://t.me/Botanja_bot?start=" + createLobbby(ctx.update.inline_query.from.id).id
                            }
                        ]
                    ]
                }
            }
        ], {
            cache_time: 0,
            is_personal: true
        });
    }

    ctx.answerInlineQuery();
})



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
                       /* [
                            {
                                text: '❌Create lobby❌',
                                callback_data: 'Create_lobby'
                            },
                            {
                                text: '❌List lobby\'s❌',
                                callback_data: 'List_lobbys'
                            }
                        ],*/
                        [
                            {
                                text: 'Invite',
                                callback_data: 'Invite_to_lobby'
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
        if(data=='Invite_to_lobby'){
            ctx.reply("Want to play a game with me?",{
                reply_markup:{
                    inline_keyboard:[
                        [
                            {
                                text:'Join to game',
                                url:"https://t.me/Botanja_bot?start=" + createLobbby(userID).id
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



bot.help(ctx => {
    ////////////////////////////////////////////////////////HELP
    id = ctx.message.chat.id;
    msg = ctx.message.text;
    if (msg.length > 5 && id != 319877134) {
        ctx.telegram.sendMessage(319877134, msg.slice(5, msg.length) + "\n\nКористувач(id)\n" + "(" + id + ")");
        ctx.reply("Дякуємо за звернення!\n\nВаше повідомлення виглядає так:\n" + msg.slice(5, msg.length));
    } else if (id == 319877134 && msg.length > 15) {
        ctx.telegram.sendMessage(msg.slice(6, 15), msg.slice(16, msg.length));
        ctx.reply("Наданна вами відповідь:\n" + msg.slice(16, msg.length) + "\nКористувачеві(id):" + msg.slice(6, 15));
    } else if (id == 319877134 && msg.length < 16) {
        ctx.reply("HEY!");
    } else {
        ctx.reply('Якщо у вас виникли питання або побажання напишіть їх в такій формі(Лапками знехнуйте):\n\n/help "Запитання" ');
    }
});


bot.use((ctx, next) => {
    if (ctx.message) {
        let userID = ctx.message.chat.id;
        let msg = ctx.message.text;
        if (msg == "/cheat") {
            if (state_users[userID].st == 505)
                ctx.reply(GetLobby(state_users[userID].lobbyID).users[0].secret_NUM);
        } else if (msg == "/surrender") {
            if (state_users[userID].st != 0) {
                let myLobby = GetLobby(state_users[userID].lobbyID);
                ctx.reply("You surrendered. \nSecret number enemy: " + myLobby.users[0].secret_NUM, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Go to menu', callback_data: 'menu' }]
                        ]
                    }
                });
                destroyLobby(myLobby);
            }
        }
        else if (state_users[userID].st == 604) {
            ctx.reply("Wait, your enemy don't join to the lobby..");
        } else if (state_users[userID].st == 605) {
            let myLobby = GetLobby(state_users[userID].lobbyID);
            myLobby.start(ctx);
        } else if (state_users[userID].st == 401) { //Change Name!
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
        else if (state_users[userID].st == 505) { //Practic mode!
            let myLobby = GetLobby(state_users[userID].lobbyID);
            let { ans, opp } = myLobby.play(msg);
            if (ans.indexOf('won') == -1) ctx.reply(ans);
            else ctx.reply(ans, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Go to menu', callback_data: 'menu' }]
                    ]
                }
            });
        } else if (state_users[userID].st == 606) { //Practic mode!
            let myLobby = GetLobby(state_users[userID].lobbyID);
            let { ans, opp } = myLobby.play(msg, userID);
            if (myLobby.users[0].id == userID) {
                if (ans.indexOf('won') == -1) {
                    ctx.reply(ans);

                    if (opp != "")
                        ctx.telegram.sendMessage(myLobby.users[1].id, opp)
                }
                else {
                    ctx.reply(ans, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Go to menu', callback_data: 'menu' }]
                            ]
                        }
                    });

                    if (opp != "")
                        ctx.telegram.sendMessage(myLobby.users[1].id, opp, {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: 'Go to menu', callback_data: 'menu' }]
                                ]
                            }
                        })
                }
            } else {
                if (ans.indexOf('won') == -1) {
                    ctx.reply(ans);

                    if (opp != "")
                        ctx.telegram.sendMessage(myLobby.users[0].id, opp)
                }
                else {
                    ctx.reply(ans, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Go to menu', callback_data: 'menu' }]
                            ]
                        }
                    });

                    if (opp != "")
                        ctx.telegram.sendMessage(myLobby.users[0].id, opp)
                }
            }
        }
    }
    return next();
});


bot.start(async (ctx) => {
    let userID = ctx.message.chat.id;
    let msg = ctx.message.text;
    if (msg.length > 36 && state_users[userID].st == 0) {
        let myLobby = GetLobby(msg.slice(7, msg.length));
        if (myLobby != undefined && myLobby.users.length < 2) {
            if (myLobby.adduser(userID)) {
                state_users[userID].lobbyID = myLobby.id;
                state_users[myLobby.users[0].id].st = 605;
                state_users[myLobby.users[1].id].st = 605;
                ctx.telegram.sendMessage(myLobby.users[0].id, "Write your secret number.[1023-9876]");
                ctx.telegram.sendMessage(myLobby.users[1].id, "Write your secret number.[1023-9876]");
            } else {
                ctx.reply("You already in the lobby");
            }
        } else ctx.reply((myLobby == undefined) ? "does not exist" : "Lobby is full.")

    } else if (state_users[userID].st == 0) {
        ctx.reply(`Welcome, ${state_users[userID].nickname}.`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'menu', callback_data: 'menu' }]
                ]
            }
        })
    }
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
    console.log(state_users);

    return next();
});

bot.launch();

/*
 *  ctx.telegram.sendMessage(ida, `Game STARTED `+ states[id].name );
 *
 *
 *  state 0 default.
 *
 *
 *  state 401 Change Name.
 *       \nEnter /Change_Name for change nickname.
 *
 *
 *  state 505 Practic mode!
 *
 *
 *  state 605 register(secret num) for online mode.
 *  state 606 online mode.
 *
 *
 * */