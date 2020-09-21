/* IMPORTS */
const http=require('http');
const websocket=require('ws');
const express=require('express');
const bodyparser=require('body-parser');
const mongo=require('mongodb').MongoClient;
const cors=require('cors');

/* SERVER */
const app = express();
const server=http.createServer(app);
const wss = new websocket.Server({server:server,path:'/websocket'}); //websokcet.Server({server:server,path:'/websocket'});

/* SERVER */
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }));
app.use(cors());

/* VARIABLES */
const url = "mongodb+srv://aladsss:lpacafcs@unogame-oxplv.mongodb.net/Cards?retryWrites=true&w=majority";
var playercards=[];
var cardplayer={};
var players={};
var tablecard={};
var p = 0;
var turn = {};
var rev = {};
var lastplayed={};
var add2=0;
var add4=0;
var allcards;
var addcards={};
var retry=0;
var users={};
var currroom=0;
var roomalready={}

/* FUNCTION OVERRIDE */
wss.broadcast = function broadcast(msg) {
    console.log(msg);
    wss.clients.forEach(function each(client) {
        client.send(msg);
    });
};

/* HANDLE REQUESTS */
app.get('/',function(req,res){
    res.end('app is working');
});

function getaroom(){
    var d1= Math.ceil(Math.random()*10)
        var d2= Math.ceil(Math.random()*10)
        var d3= Math.ceil(Math.random()*10)
        var d4= Math.ceil(Math.random()*10)
        var d5= Math.ceil(Math.random()*10)
        var d6= Math.ceil(Math.random()*10)
        return ''+d1+d2+d3+d4+d5+d6
}

app.post('/login', async function (req, res) {
    if(currroom===0){
        currroom = getaroom();
        while(roomalready[currroom]){
            currroom = getaroom();
        }
        roomalready[currroom]=1;
    }
    mongo.connect(url, async function (err, client) {
        if (err) {
            console.log(err);
        } else {
            console.log('connected');
        }
        if(!req.body.user && !req.body.pass){res.end();} else{
        var user = { user: req.body.user };
        var db = client.db('Cards');
        
        db.collection('logindata').find(user).toArray(async function (err, result) {
            if (err) {
                console.log(err);
            } else {
                if (result[0].pass == req.body.pass) {
                    user = req.body.user;
                    var p1 = ()=>{ return new Promise((resolve,rejects)=>{
                        db.collection('allcards').find({}).toArray(async function (err,result) {
                            cards = result;
                            for (var i = 0; i < 7; i++) {
                                playercards.push(cards[Math.floor(Math.random() * 54)])
                            }
                            console.log(playercards)
                            await db.collection("game").insertOne({ user: user, cards: playercards, room:currroom }).then(res=>{playercards=[];resolve(playercards)});
                        })
                    })}
                    var sendres;
                    var p2=()=>{return new Promise((resolve)=>{
                        db.collection("game").find({room:currroom}).toArray((err,data)=>{
                            res.send(JSON.stringify({auth:true,room:currroom}))
                            if(data.length===4){
                                currroom=0;
                            } else {}
                            client.close();
                            resolve(currroom)
                        })
                    }) }
                    await p1().then(async (res)=>{await p2().then((res)=>{})})
                    res.end()
                } else {
                    client.close();
                    res.end(JSON.stringify({auth:false,room:null}));
                }
            }
        })
    }
    })
})

app.post('/signup', function (req, res) {
    mongo.connect(url, function (err, client) {
        if (err) {
            console.log(err);
        } else {
            console.log('connected');
        }
        var db = client.db('Cards');
        var data = {
            name: req.body.name,
            user: req.body.user,
            mail: req.body.mail,
            pass: req.body.pass
        }
            db.collection('logindata').insertOne(data, function (err, res) {
                if (err) {
                    throw err;
                } else {
                    console.log('data entered');
                    client.close();
                }
            })
    })
})

app.post('/logout', function (req, res) {
    mongo.connect(url,function(err,client){
        if(err){
            console.log(err);
        }else{
            console.log('logout');
        }
        var db=client.db("Cards");
        db.collection("game").deleteOne({user:req.body.user});
        var i=players.indexOf(req.body.user);
        players.splice(i,1);
        cardplayer.splice(i,1);
        console.log(players);
        console.log(cardplayer);
        client.close();
    })
})

/* HANDLE WEBSOCKET */
wss.on('connection',(ws)=>{
    ws.on('message',(data)=>{
        var res=JSON.parse(data);//{action:xyz,last.....}
        var room=res.room;
        console.log(res);
        console.log(cardplayer);
        if(res.action === 'start'){
            start(res.user,ws,res.room);
        } else if (res.action == "rplayed") {
            rev[res.room]?rev[res.room] = !rev[res.room]:rev[res.room]=false;
            lastplayed[room] = res.played;
            tablecard[room] = res.tablecard;
            let i= cardplayer[room].indexOf(cardplayer[room].find(x=>x.user===lastplayed[room]));
            cardplayer[room][i].cards.splice(findWithAttr(cardplayer[room][i].cards,['num','color'],[tablecard[room].num,tablecard[room].color]),1);
            nextturn(ws,res.room);
        }
        else if (res.action == "splayed"){
            if(rev[room]){
                turn[room]--;
                if(turn[room]<0){turn[room]=3;}
            }
            else{
                turn[room]++;
                if(turn[room]>3){turn[room]=0;}
            }
            lastplayed[room]=res.played;
            tablecard[room]=res.tablecard;
            let i= cardplayer[room].indexOf(cardplayer[room].find(x=>x.user===lastplayed[room]));
            cardplayer[room][i].cards.splice(findWithAttr(cardplayer[room][i].cards,['num','color'],[tablecard[room].num,tablecard[room].color]),1);
            nextturn(ws,res.room);
        }
        else if(res.action == "2played"){
            add2=1;
            lastplayed[room]=res.played;
            tablecard[room]=res.tablecard;
            let i= cardplayer[room].indexOf(cardplayer[room].find(x=>x.user===lastplayed[room]));
            cardplayer[room][i].cards.splice(findWithAttr(cardplayer[room][i].cards,['num','color'],[tablecard[room].num,tablecard[room].color]),1);
            nextturn(ws,res.room);
        }
        else if(res.action == "played"){
            lastplayed[room]=res.played;
            tablecard[room]=res.tablecard;
            let i= cardplayer[room].indexOf(cardplayer[room].find(x=>x.user===lastplayed[room]));
            cardplayer[room][i].cards.splice(findWithAttr(cardplayer[room][i].cards,['num','color'],[tablecard[room].num,tablecard[room].color]),1);
            nextturn(ws,res.room);
        }
        else if(res.action=="wplayed"){
            lastplayed[room]=res.played;
            tablecard[room]=res.tablecard;
            let i= cardplayer[room].indexOf(cardplayer[room].find(x=>x.user===lastplayed[room]));
            cardplayer[room][i].cards.splice(findWithAttr(cardplayer[room][i].cards,['num','color'],[tablecard[room].num,tablecard[room].color]),1);
            nextturn(ws,res.room);
        }
        else if(res.action=="4played"){
            add4=1;
            lastplayed[room]=res.played;
            tablecard[room]=res.tablecard;
            let i= cardplayer[room].indexOf(cardplayer[room].find(x=>x.user===lastplayed[room]));
            cardplayer[room][i].cards.splice(findWithAttr(cardplayer[room][i].cards,['num','color'],[tablecard[room].num,tablecard[room].color]),1);
            nextturn(ws,res.room);
        }
        else if(res.action=="d2"){
            lastplayed[room]=res.played;
            nextturn(ws,res.room);
        }
        else if(res.action=="win"){
            wss.broadcast(JSON.stringify({action:'win',user:res.user,room:res.room}));
        }
        else if(res.action=="draw"){
            lastplayed[room]=res.played;
            var drawcard=allcards[Math.floor(Math.random()*54)]
            let i= cardplayer[room].indexOf(cardplayer[room].find(x=>x.user===lastplayed[room]));
            cardplayer[room][i].cards.push(drawcard)
            var op=[];
            for(var d of cardplayer[room]){
                if(d.user===players[room][turn[room]]){op.push({name:d.user,num:d.cards.length,turn:1})}
                else{op.push({name:d.user,num:d.cards.length,turn:0});}
            }
            wss.broadcast(JSON.stringify({action:'drawrep',addcard:[drawcard],user:lastplayed[room],op:op,room:room}))
        }
        else if(res.action=='drawanim'){
            wss.broadcast(JSON.stringify({action:'drawanimresp',number:res.number,user:res.user,room:res.room}));
        }
        else if(res.action=='opplayedanim'){
            wss.broadcast(JSON.stringify({action:'opresp',card:res.card,user:res.user,room:res.room}));
        }
    })
})

async function start(user,ws,room) {
    mongo.connect(url, function (err, client) {
        if (err) {
            console.log(err);
        } else {
            console.log('connected');
        }
        var db = client.db('Cards');

        db.collection("allcards").find().toArray(function(err,data){
            allcards=data;
            if(!tablecard[room]){tablecard[room] = data[Math.floor(Math.random() * 54)]}
        });
        db.collection("game").find({room:room}).toArray(function(err,data){
            if(data.length<4){
                console.log("retry");
                ws.send(JSON.stringify({action:"retry",room:room}));
                client.close();
                return;
            }
            else{
                console.log(data[0].cards);
                console.log(user);
                cardplayer[room] = data;
                for(var d of data){
                    users[room]?users[room].push(d.user):users[room]=[d.user];
                }
                turn[room]=0
                for (i = 0; i < data.length; i++) {
                    console.log(data[i].user);
                    if (data[i].user == user) {
                        console.log('sent');
                        players[room]?players[room].push(data[i].user):players[room]=[data[i].user];
                        ws.send(JSON.stringify({action:'startreturn',cards: data[i].cards ,tablecard: tablecard[room] ,turn: players[room][turn[room]], users:users[room],room:room}));
                    }
            }
            console.log(players);
            }
        })
        client.close();
    })
}

function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr[0]] === value[0] && array[i][attr[1]] === value[1]) {
            return i;
        }
    }
    return -1;
}

function winnhogaya(d,room){
    mongo.connect(url,function(err,client){
        if(err){
            console.log(err);
        }else{
            console.log('logout');
        }
        var db=client.db("Cards");
        for(let x of cardplayer){
            db.collection("game").deleteOne({user:x.user});
        }
        client.close();
    })
     playercards=[];
 delete cardplayer[room];
 delete players[room];
 delete tablecard[room];
 p = 0;
 delete turn[room];
 delete rev[room];
 delete lastplayed[room];
 add2=0;
 add4=0;
 allcards;
 addcards=[];
 retry=0;
 delete users[room];
 delete roomalready[room]
 wss.broadcast(JSON.stringify({action:'win',user:d.user,room:room}));
}

function nextturn(ws,room) {
    if(rev[room]){
        turn[room]--;
        if(turn[room]<0){turn[room]=3;}
    }
    else{
        turn[room]++;
        if(turn[room]>3){turn[room]=0;}
    }
    if(add2){
        for(var i=0;i<2;i++){
            let xcard=allcards[Math.floor(Math.random()*54)]
            addcards.push(xcard);
            cardplayer[turn].cards.push(xcard);
        }
        add2=0;
    }else if(add4){
        for(var i=0;i<4;i++){
            let xcard=allcards[Math.floor(Math.random()*54)]
            addcards.push(xcard);
            cardplayer[turn].cards.push(xcard);
        }
        add4=0;
    }else{
        addcards=[];
    }
    var op=[];
            for(var d of cardplayer[room]){
                if(d.user===players[room][turn[room]]){op.push({name:d.user,num:d.cards.length,turn:1})}
                else{op.push({name:d.user,num:d.cards.length,turn:0});}
                if(d.cards.length===0){
                    winnhogaya(d,room);
                    return;
                }
            }
    wss.broadcast(JSON.stringify({action:'nextturn',tablecard:tablecard[room],turn:players[room][turn[room]],addcards:addcards, op:op, room:room}));
}


/* LISTEN */
server.listen( process.env.PORT || 3001);