const http = require('http');
const url = require('url');
const Worker = require('./worker.js');

const type = {'Content-Type': 'text/html'};

const MessageListener = class{
	constructor(){
		this.isReceived = false;
		this.isJoined = false;
		this.queue = [];
		this.listener = (request, response)=>{
			const path = url.parse(request.url).path;
			this.isReceived = true;
			if(path.includes('join')) this.isJoined = true;
			let result = '';
			response.writeHead(200, type);
			if(this.queue.length) result = this.queue.pop();
			response.end(`Connection.callback('${result}')`);
		};
	}
	processMessage(message){
		this.queue.push(message);
	}
	receivesAMessage(request){
		return this.isReceived;
	}
};
const FakeAuctionServer = class{
	constructor(item){
		this.server = null;
		this.item = item;
		this.url = 'http://127.0.0.1:8080';
		this.messager = new MessageListener();
	}
	getItemId(){
		return this.item;
	}
	startSellingItem(){
		if(!this.server) this.server = http.createServer(this.messager.listener).listen(8080);
	}
	hasReceivedJoin(){
		return this.messager.isJoined;
	}
	announceClosed(){
		this.messager.processMessage('');
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
			'http://projectBS.bsidesoft.io/s66/js/11/', 
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
		reporter.assert('auction.hasReceivedJoin()', auction.hasReceivedJoin(), true);
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
