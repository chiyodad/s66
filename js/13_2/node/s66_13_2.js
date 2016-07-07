const http = require('http');
const url = require('url');
const Worker = require('./worker.js');

const type = {'Content-Type': 'text/html'};

const MessageListener = class{
	constructor(){
		this.queue = [];
		this.listener = (request, response)=>{
			const path = url.parse(request.url).path;
			this.received = path;
			response.writeHead(200, type);
			let result = '';
			if(this.queue.length) result = this.queue.pop();
			response.end(`Connection.callback('${result}')`);
		};
	}
	processMessage(message){
		this.queue.push(message);
	}
	receivesAMessage(){
		return this.received;
	}
};
const Matcher = class{
	static equalTo(format){
		return new Matcher('equal', format);
	}
	constructor(type, format){
		this.type = type;
		this.format = format;
	}
	result(str, ...arg){
		switch(this.type){
		case'equal':
			return str == this.format.replace(/(\$\{([0-9]+)\})/g, (v,v0,v1)=>arg[v1]);
		}
	}
};
const JOIN_COMMAND_FORMAT = '/join/${0}/${1}';
const BID_COMMAND_FORMAT = '/bid/${0}/${1}';
const FakeAuctionServer = class{
	constructor(item){
		this.server = null;
		this.item = item;
		this.url = 'http://127.0.0.1:8080';
		this.listener = new MessageListener();
	}
	getItemId(){
		return this.item;
	}
	receivesAMessageMatching(matcher, ...arg){
		return matcher.result(this.listener.receivesAMessage(), ...arg);
	}
	startSellingItem(){
		if(!this.server) this.server = http.createServer(this.listener.listener).listen(8080);
	}
	reportPrice(price, increment, bidder){
		this.listener.processMessage(`price,${price},${increment},${bidder}`);
	}
	hasReceivedJoin(sniperId){
		return this.receivesAMessageMatching(Matcher.equalTo(JOIN_COMMAND_FORMAT), sniperId, this.item);
	}
	hasReceivedBid(sniperId, bid){
		return this.receivesAMessageMatching(Matcher.equalTo(BID_COMMAND_FORMAT), sniperId, bid);
	}
	announceClosed(){
		this.listener.processMessage('close');
	}
	stop(){
		this.server.close();
	}
};

const Reporter = require('./reporter.js');
const reporter = new Reporter();
let auction, client;
const test = {
	start(){
		auction = new FakeAuctionServer('item-54321');
		client = new Worker(
			'http://www.bsidesoft.com/hika/s66/13_2/', 
			_=>{
				auction.startSellingItem();
				client.js('runner = new Runner()').
				then(_=>client.js(`runner.startBiddingIn('${auction.getItemId()}')`)).
				then(_=>setTimeout(test.joined, 1000));
			},
			{y:740}
		);
	},
	joined(){
		reporter.assert(`auction.hasReceivedJoin('hika')`, auction.hasReceivedJoin('hika'), true);
		auction.reportPrice(1000, 98, 'other bidder');
		client.js('Connection.pushed()').
		then(_=setTimeout(test.price, 1000));
	},
	price(){
		client.js('return runner.showsSniperIsBidding()').
		then(v=>{
			reporter.assert('runner.showsSniperIsBidding()', v, true);
			setTimeout(test.bidding, 1000);
		});
	},
	bidding(){
		reporter.assert(`auction.hasReceivedBid('hika', 1098)`, auction.hasReceivedBid('hika', 1098), true);
		auction.announceClosed();
		client.js('Connection.pushed()').
		then(_=setTimeout(test.losted, 1000));
	},
	losted(){
		client.js('return runner.showsSniperHasLostAuction()').
		then(v=>reporter.assert('runner.showsSniperHasLostAuction()', v, true));
	}
};
test.start();