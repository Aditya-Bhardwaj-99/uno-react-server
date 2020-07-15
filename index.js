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
var cardplayer;
var players=[];
var tablecard='';
var p = 0;
var turn = 0;
var rev = false;
var lastplayed;
var add2=0;
var add4=0;
var allcards;
var addcards=[];
var retry=0;
var users=[];

/* FUNCTION OVERRIDE */
wss.broadcast = function broadcast(msg) {
    console.log(msg);
    wss.clients.forEach(function each(client) {
        client.send(msg);
    });
};

/* HANDLE REQUESTS */
app.get('/',function(){
    res.end('app is working');
})
app.post('/login', function (req, res) {
    mongo.connect(url, function (err, client) {
        if (err) {
            console.log(err);
        } else {
            console.log('connected');
        }
        if(!req.body.user && !req.body.pass){res.end();} else{
        var user = { user: req.body.user };
        var db = client.db('Cards');
        
        db.collection('logindata').find(user).toArray(function (err, result) {
            if (err) {
                console.log(err);
            } else {
                if (result[0].pass == req.body.pass) {
                    user = req.body.user;
                    db.collection('allcards').find({}).toArray(function (err,result) {
                        cards = result;
                        for (var i = 0; i < 7; i++) {
                            playercards.push(cards[Math.floor(Math.random() * 54)])
                        }
                        console.log(playercards)
                        db.collection("game").insertOne({ user: user, cards: playercards }).then(res=>{client.close();playercards=[];});
                    })
                    
                    res.end(JSON.stringify({auth:true}))
                } else {
                    client.close();
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
        var res=JSON.parse(data);
        console.log(res);
        console.log(cardplayer);
        if(res.action === 'start'){
            start(res.user,ws);
        } else if (res.action == "rplayed") {
            rev = !rev;
            lastplayed = res.played;
            tablecard = res.tablecard;
            let i= cardplayer.indexOf(cardplayer.find(x=>x.user===lastplayed));
            cardplayer[i].cards.splice(findWithAttr(cardplayer[i].cards,['num','color'],[tablecard.num,tablecard.color]),1);
            nextturn(ws);
        }
        else if (res.action == "splayed"){
            if(rev){
                turn--;
                if(turn<0){turn=3;}
            }
            else{
                turn++;
                if(turn>3){turn=0;}
            }
            lastplayed=res.played;
            tablecard=res.tablecard;
            let i= cardplayer.indexOf(cardplayer.find(x=>x.user===lastplayed));
            cardplayer[i].cards.splice(findWithAttr(cardplayer[i].cards,['num','color'],[tablecard.num,tablecard.color]),1);
            nextturn(ws);
        }
        else if(res.action == "2played"){
            add2=1;
            lastplayed=res.played;
            tablecard=res.tablecard;
            let i= cardplayer.indexOf(cardplayer.find(x=>x.user===lastplayed));
            cardplayer[i].cards.splice(findWithAttr(cardplayer[i].cards,['num','color'],[tablecard.num,tablecard.color]),1);
            nextturn(ws);
        }
        else if(res.action == "played"){
            lastplayed=res.played;
            tablecard=res.tablecard;
            let i= cardplayer.indexOf(cardplayer.find(x=>x.user===lastplayed));
            cardplayer[i].cards.splice(findWithAttr(cardplayer[i].cards,['num','color'],[tablecard.num,tablecard.color]),1);
            nextturn(ws);
        }
        else if(res.action=="wplayed"){
            lastplayed=res.played;
            tablecard=res.tablecard;
            let i= cardplayer.indexOf(cardplayer.find(x=>x.user===lastplayed));
            cardplayer[i].cards.splice(findWithAttr(cardplayer[i].cards,['num','color'],[tablecard.num,tablecard.color]),1);
            nextturn(ws);
        }
        else if(res.action=="4played"){
            add4=1;
            lastplayed=res.played;
            tablecard=res.tablecard;
            let i= cardplayer.indexOf(cardplayer.find(x=>x.user===lastplayed));
            cardplayer[i].cards.splice(findWithAttr(cardplayer[i].cards,['num','color'],[tablecard.num,tablecard.color]),1);
            nextturn(ws);
        }
        else if(res.action=="d2"){
            lastplayed=res.played;
            nextturn(ws);
        }
        else if(res.action=="win"){
            wss.broadcast(JSON.stringify({action:'win',user:res.user}));
        }
        else if(res.action=="draw"){
            lastplayed=res.played;
            var drawcard=allcards[Math.floor(Math.random()*54)]
            let i= cardplayer.indexOf(cardplayer.find(x=>x.user===lastplayed));
            cardplayer[i].cards.push(drawcard)
            var op=[];
            for(var d of cardplayer){
                if(d.user===players[turn]){op.push({name:d.user,num:d.cards.length,turn:1})}
                else{op.push({name:d.user,num:d.cards.length,turn:0});}
            }
            wss.broadcast(JSON.stringify({action:'drawrep',addcard:[drawcard],user:lastplayed,op:op}))
        }
        else if(res.action=='drawanim'){
            wss.broadcast(JSON.stringify({action:'drawanimresp',number:res.number,user:res.user}));
        }
        else if(res.action=='opplayedanim'){
            wss.broadcast(JSON.stringify({action:'opresp',card:res.card,user:res.user}));
        }
    })
})

async function start(user,ws) {
    mongo.connect(url, function (err, client) {
        if (err) {
            console.log(err);
        } else {
            console.log('connected');
        }
        var db = client.db('Cards');

        db.collection("allcards").find().toArray(function(err,data){
            allcards=data;
            if(tablecard===''){tablecard = data[Math.floor(Math.random() * 54)]}
        });
        db.collection("game").find({}).toArray(function(err,data){
            if(data.length<4){
                console.log("retry");
                ws.send(JSON.stringify({action:"retry"}));
                client.close();
                return;
            }
            else{
                console.log(data[0].cards);
                console.log(user);
                cardplayer = data;
                for(var d of data){
                    users.push(d.user);
                }
                for (i = 0; i < data.length; i++) {
                    console.log(data[i].user);
                    if (data[i].user == user) {
                        console.log('sent');
                        players.push(data[i].user);
                        ws.send(JSON.stringify({action:'startreturn',cards: data[i].cards ,tablecard: tablecard ,turn: players[turn], users:users}));
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

function winnhogaya(d){
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
 cardplayer;
 players=[];
 tablecard='';
 p = 0;
 turn = 0;
 rev = false;
 lastplayed;
 add2=0;
 add4=0;
 allcards;
 addcards=[];
 retry=0;
 users=[];
 wss.broadcast(JSON.stringify({action:'win',user:d.user,op:op}));
}

function nextturn(ws) {
    if(rev){
        turn--;
        if(turn<0){turn=3;}
    }
    else{
        turn++;
        if(turn>3){turn=0;}
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
            for(var d of cardplayer){
                if(d.user===players[turn]){op.push({name:d.user,num:d.cards.length,turn:1})}
                else{op.push({name:d.user,num:d.cards.length,turn:0});}
                if(d.cards.length===0){
                    winnhogaya(d);
                    return;
                }
            }
    wss.broadcast(JSON.stringify({action:'nextturn',tablecard:tablecard,turn:players[turn],addcards:addcards, op:op}));
}


/* LISTEN */
server.listen( process.env.PORT || 3001);