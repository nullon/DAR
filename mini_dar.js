'use strict';

/*
[mini]divide&role 25-04-10 

依存関係
├── discord.js@14.19.3
└── fs@0.0.1-security
/**/

let date = new Date().toLocaleString();//起動確認用メッセージ
console.log(`[${date}]${import.meta.filename}を起動しました。`);

//トークン取得
import fs from 'fs';
const Token = fs.readFileSync('files/divide&role.token','utf-8').split('\n')[1];//Divide&role

import {//discord.jsから各種オブジェクトを読み込む
    Client,
    GatewayIntentBits,
    MessageFlags,
    Partials,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
}from 'discord.js';

const client = new Client({//Clientの初期設定
    //botの権限と読み取るイベント
	intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,//特権Intents
        //GatewayIntentBits.GuildBans,
        //GatewayIntentBits.GuildEmojisAndStickers,
        //GatewayIntentBits.GuildIntegrations,
        //GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,//特権Intents
        GatewayIntentBits.GuildMessages,
        //GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,

        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        //GatewayIntentBits.DirectMessageTyping,
        
        GatewayIntentBits.MessageContent,//特権Intents
        //GatewayIntentBits.GuildScheduledEvents,
        //GatewayIntentBits.AutoModerationConfiguration,
        //GatewayIntentBits.AutoModerationExecution,
        //GatewayIntentBits.GuildMessagePolls,
        //GatewayIntentBits.DirectMessagePolls,
	],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
});

//基幹オブジェクト
const DAR = {
    
    testGuild:'1190026977315410031',

    roles:{
        'online':{name:  'オンライン',   color:0x43a25a},
        'idle'  :{name:  '退席中'    ,   color:0xca9654},
        'dnd'   :{name:  '取り込み中',   color:0xd83a42},
        'offline':{name:  'オフライン',  color:0x82838b},
    },

    roleToStatus:{
        'オンライン'    :'online',
        '退席中'        :'idle',
        '取り込み中'    :'dnd',
        'オフライン'    :'offline',
    },
        
    async createRoles(guild = DAR.testGuild){//DARロール一括生成

        const guildRoles = await guild.roles.fetch();//ギルドの最新情報を取得
        const roles = new Set();//ロールを収納するセットの作成

        guildRoles.forEach(element => {//ギルドのロールの数だけロールセットにフォーマットして収納する
            const key = `${element.name}-${element.color}`;
            roles.add(key);
        });

        console.log(roles);//デバッグ用

        for(const role of Object.values(DAR.roles)){//ステータスロールを代入して繰り返す(4回)
            const key = `${role.name}-${role.color}`;
            
            if (!roles.has(key)) {
                console.log(key);

                await guild.roles.create({//ギルドにこのロールがない場合、生成する
                    reason      : 'DARによる自動生成',
                    name        : role.name,
                    color       : role.color,
                    hoist       : true,
                    mentionable : true,
                    //permissions : [],
                    //position    : 10,
                })
                .then(console.log)
                .catch(console.error);
            }else{console.log(`${role.name}は既にあります。`);}
        }
    },

    async deleteRoles(guild = DAR.testGuild){//DARロール一括削除
        
        const guildRoles = await guild.roles.fetch();
        
        const darRoles = new Set();
        for(const role of Object.values(DAR.roles)){//ステータスロールを代入して繰り返す(4回)
            const key = `${role.name}-${role.color}`;
            darRoles.add(key);
        }

        for(const role of guildRoles.values()){//ギルドに存在する
            if (darRoles.has(`${role.name}-${role.color}`)) {
                await role.delete('DARによる一括削除')
                .then(deleted => console.log(`${deleted.name}を削除しました。`))
                .catch(console.error);
            }else{console.log(`${role.name}-${role.color}はDARのテーブルに存在しません。`);}
        }

    },

    roleSet:new Set([
          'オンライン',
          '退席中',
          '取り込み中',
          'オフライン',
    ]),
    
}//end of the DAR

//ログイン時
client.on('ready', async () => {
    const date = new Date().toLocaleString();//ログイン日時出力
    console.log(`[${date}]${client.user.tag}でログインしました。`);
    if(DAR.testGuild){DAR.testGuild = client.guilds.cache.get(DAR.testGuild);}//テスト用ギルドの取得
});

//メッセージが送信されたとき
client.on('messageCreate', async (message) => {
    if(message.author.bot){return;}//BOTは無視
});

//ユーザーのステータスが更新された時に実行される
client.on('presenceUpdate',async (before,after)=>{
    if(after.user.bot){return;}//BOTは無視する

    //ユーザーに対する処理    
    let afterStatus = after.status;
    let beforeStatus = 'offline';//beforeStatusの初期化
    if(before){beforeStatus = before.status}//beforeが存在する場合、ステータスを取得する
    if(afterStatus === beforeStatus){return;}//ステータスの変更がない場合は終了する

    const guildRoles = {};//取得したギルドのロールを収納するオブジェクト
    after.guild.roles.cache.forEach((role) => {//キャッシュからギルドのロールを取得する
        if(DAR.roleSet.has(`${role.name}`)){
            guildRoles[DAR.roleToStatus[role.name]] = role.id;
        }
    });

    const member = await after.member.fetch();//メンバーの最新情報を取得
    const memberRoles = member.roles.cache.map(role => role.id);//メンバーの保持しているロールIDを全て取得
    const removeRoles = [];//一括で削除するロールを収納する配列オブジェクト

    for(const [role,id] of Object.entries(guildRoles)){//ロールの付替え
        if(afterStatus !== role && memberRoles.includes(id)){removeRoles.push(id);}
    }

    if(removeRoles.length){await member.roles.remove(removeRoles);}//取り外すロールがあるなら一括で取り外す
    if(guildRoles[afterStatus]){//追加するロールがあるなら
        await member.roles.add(guildRoles[afterStatus]);//現在のロールを追加する
    }
});

//どこかしらのギルドで新しいロールが作られた時
client.on('roleCreate', async (role) => {await role.guild.roles.fetch();});
client.on('roleDelete', async (role) => {await role.guild.roles.fetch();});
client.on('roleUpdate', async (oldRole, newRole) => {await newRole.guild.roles.fetch();});

//サーバーに追加された時に実行される
client.on('guildCreate',async(guild)=>{
    console.log(`${guild.name}に追加されました。`);
    //なんかいい感じのイントロダクションを追加する
});

//ユーザーがサーバーに参加した時に実行される
client.on('guildMemberAdd',(guildMember)=>{
    const guild = guildMember.guild;
    const member = guildMember.user;
});

//クライアントログイン
client.login(Token);