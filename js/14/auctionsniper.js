const Connection =(_=>{
	let scriptListener;
	return class{
		static connection(url, listener){
			const script = document.head.appendChild(document.createElement('script'));
			script.src = `http://127.0.0.1:8080/${url}`;
			scriptListener = listener;
			return script;
		}		
		static callback(data){
			if(scriptListener) scriptListener(data);
		}
		static pushed(){
			Connection.connection(
				'', 
				data=>runner.main.listener.processMessage(data)
			);
		}
	};
})();
const PriceSource = class{
	static get FromSniper(){return Symbol.for('PriceSource.FromSniper');}
	static get FromOtherBidder(){return Symbol.for('PriceSource.FromOtherBidder');}
};
const AuctionMessageTranslator = class{
	constructor(sniperId, listener){
		this.sniperId = sniperId;
		this.listener = listener;
	}
	processMessage(message){
		const e = AuctionEvent.from(message);
		switch(e.type){
		case'close':this.listener.auctionClosed(); break;
		case'price':this.listener.currentPrice(e.currenPrice, e.increment, e.isFrom(this.sniperId)); break;
		}
	}
};
const AuctionEvent = class{
	static from(msg){
		const e = new AuctionEvent();
		msg = msg.split(',');
		[e.type, ...msg] = msg;

		switch(e.type){
		case'close':break;
		case'price':
			e.currenPrice = parseFloat(msg[0]);
			e.increment = parseFloat(msg[1]);
			e.bidder = msg[2];
			break;
		}
		return e;
	}
	isFrom(sniperId){
		return sniperId == this.bidder ? PriceSource.FromSniper : PriceSource.FromOtherBidder;
	}
	
};

const AuctionSniper = class{
	constructor(auction, sniperListener){
		this.isWinning = false;
		this.auction = auction;
		this.listener = sniperListener;
	}
	auctionClosed(){
		if(this.isWinning){
			this.listener.sniperWon();
		}else{
			this.listener.sniperLost();
		}
	}
	currentPrice(price, increment, priceSource){
		this.isWinning = priceSource == PriceSource.FromSniper;
		if(this.isWinning){
			this.listener.sniperWinning();
		}else{
			this.auction.bid(price + increment);
			this.listener.sniperBidding();
		}
	}
};
const XMPPAuction = class{
	constructor(sniperId, itemId, callback){
		this.sniperId = sniperId;
		this.itemId = itemId;
		this.callback = callback;
	}
	bid(amount){
		this.sendMessage(`bid/${this.sniperId}/${amount}`);
	}
	join(){
		this.sendMessage(`join/${this.sniperId}/${this.itemId}`);
	}
	sendMessage(msg){
		Connection.connection(msg, this.callback);
	}
};
const MainWindow = class{
	static get STATUS_JOINING(){return 'join';}
	static get STATUS_BIDDING(){return 'bid';}
	static get STATUS_LOST(){return 'lost';}
	static get STATUS_WINNING(){return 'win';}
	static get STATUS_WON(){return 'won';}
	
	constructor(){
		const frame = document.body.appendChild(document.createElement('div'));
		frame.style.cssText = 'background:#ff0;border:1px solid #000;border-radius:5px';
		this.sniperStatus = frame.appendChild(document.createElement('div'));
		this.sniperStatus.id = 'sniperStatus';
	}
	showStatus(status){
		this.sniperStatus.innerHTML = status;
	}
};
const SniperStateDisplayer = class{
	constructor(ui){
		this.ui = ui;
	}
	sniperBidding(){
		this.showStatus(`${MainWindow.STATUS_BIDDING}`);
	}
	sniperLost(){
		this.showStatus(MainWindow.STATUS_LOST);
	}
	sniperWinning(){
		this.showStatus(MainWindow.STATUS_WINNING);
	}
	sniperWon(){
		this.showStatus(MainWindow.STATUS_WON);
	}
	showStatus(msg){
		this.ui.showStatus(msg);
	}
};
const Main = class{
	constructor(sniperId, itemId){
		const auction = new XMPPAuction(sniperId, itemId, data=>this.listener.processMessage(data));
		this.listener = new AuctionMessageTranslator(
			sniperId,
			new AuctionSniper(
				auction,
				new SniperStateDisplayer(new MainWindow())
			)
		);
		auction.join();
	}
};
const Driver = class{
	constructor(main){
		this.main = main;
	}
	showSniperStatus(statusText){
		return document.getElementById('sniperStatus').innerHTML.includes(statusText);
	}
};
const Runner = class{
	constructor(){
		this.sniper_id = 'hika';
	}
	startBiddingIn(itemId){
		this.main = new Main(this.sniper_id, itemId);
		this.driver = new Driver(this.main);
		this.driver.showSniperStatus(MainWindow.STATUS_JOINING);
	}
	showsSniperIsBidding(){
		return this.driver.showSniperStatus(MainWindow.STATUS_BIDDING);
	}
	showsSniperHasLostAuction(){
		return this.driver.showSniperStatus(MainWindow.STATUS_LOST);
	}
	showsSniperIsWinning(){
		return this.driver.showSniperStatus(MainWindow.STATUS_WINNING);
	}
	showsSniperHasWonAuction(){
		return this.driver.showSniperStatus(MainWindow.STATUS_WON);
	}
};
let runner;