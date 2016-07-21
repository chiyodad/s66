const fs = require('fs');
const http = require('http');
const url = require('url');

const Matcher = require('./Matcher.js');
const JOIN_COMMAND_FORMAT = '${0}/${1}/join';
const BID_COMMAND_FORMAT = '${0}/${1}/bid/${2}';

const listeners = [
(path, bodys, response)=>{
	const file = path.split('/').pop();
	if('index.html,sniper.js,app.js,display.js'.includes(file)){
		response.writeHead(200, {'Content-Type':file.endsWith('.js') ? 'text/javascript' : 'text/html'});
		fs.readFile('files/' + file, (e,v)=>response.end(v));
		return true;
	}
}];
const server = http.createServer((req, res)=>{
	const bodys = [], path = url.parse(req.url).path.substr(1);
	for(const listener of listeners){
		if(listener(path, bodys, res))return;
	}
	res.writeHead(200, {'Content-Type':'text/html'});
	res.end(bodys.join(''));
});

const MessageListener = class{
	constructor(itemId){
		this.itemId = itemId;
		this.queue = [];
		this.received = '';
		this.listener = (path, bodys)=>{
			let body = '';
			if(path.startsWith(itemId)){
				const message = path.split('/').slice(1);
				if(message[1] == 'polling'){
					body = this.queue.length ? this.queue.pop() : '';
				}else{
					this.received = path;
				}
			}
			bodys.push(body);
		};		
	}
	processMessage(message){this.queue.push(`${this.itemId},${message}`);}
	receivesAMessage(){
		const msg = this.received;
		this.received = '';
		return msg;
	}
	start(){listeners.includes(this.listener) || listeners.push(this.listener);}
	stop(){listeners.includes(this.listener) && listeners.splice(listeners.indexOf(this.listener), 1);}
};

module.exports = class{
	static start(port){server.listen(port);}
	constructor(itemId){
		this.itemId = itemId;
		this.listener = new MessageListener(itemId);
	}
	[Symbol.toPrimitive](hint){return `new FakeAuction('${this.itemId}')`;}
	stop(){this.listener.stop();}
	startSellingItem(){this.listener.start();}	
	reportPrice(price, increment, bidder){
		this.processMessage(`price,${price},${increment},${bidder}`);
	}
	announceClosed(){this.processMessage('close');}
	hasReceivedJoin(sniperId){
		return this.receivesAMessageMatching(Matcher.equalTo(JOIN_COMMAND_FORMAT), sniperId);
	}
	hasReceivedBid(sniperId, bid){
		return this.receivesAMessageMatching(Matcher.equalTo(BID_COMMAND_FORMAT), sniperId, bid);
	}
	processMessage(message){
		this.listener.processMessage(message);
	}
	receivesAMessageMatching(matcher, ...arg){
		return matcher.result(this.listener.receivesAMessage(), this.itemId, ...arg);
	}
};
