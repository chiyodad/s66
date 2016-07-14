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
const Table = class{
	constructor(){
		
	}
	getColumeCount(){
		return 1;
	}
	getRowCount(){
		return 1;
	}
	getValueAt(rowIndex, columIndex){
		return this.statusText;
	}
	setStatusText(status){
		this.statusText = status;
		this.render();
	}
	setTable(table){
		this.table = table;
	}
	render(){
		if(!this.table) return;
		//clear
		const rows = this.table.querySelectorAll('tr');
		let i = rows.length, j;
		console.log(i);
		while(i--) this.table.removeChild(rows[i]);
		//render
		for(i = 0; i < this.getRowCount(); i++){
			const row = this.table.appendChild(document.createElement('tr'));
			for(j = 0; j < this.getColumeCount(); j++){
				const cell = row.appendChild(document.createElement('td'));
				cell.innerHTML = this.getValueAt(i, j);
			}
		}
	}
};
const MainWindow = class{
	static get MAIN_WINDOW_NAME(){return '<h1>AuctionSniper</h1>';}
	static get SNIPERS_TABLE_NAME(){return 'SnipersTable';}
	
	static get STATUS_JOINING(){return 'join';}
	static get STATUS_BIDDING(){return 'bid';}
	static get STATUS_LOST(){return 'lost';}
	static get STATUS_WINNING(){return 'win';}
	static get STATUS_WON(){return 'won';}
	
	constructor(){
		this.snipers = new Table();
		
		this.frame = document.body.appendChild(document.createElement('div'));
		this.frame.style.cssText = 'background:#ff0;border:1px solid #000;border-radius:5px;margin:5px 10px 50px 10px';

		this.title = this.frame.appendChild(document.createElement('div'));
		this.title.innerHTML = MainWindow.MAIN_WINDOW_NAME;
		
		this.fillContentPane(this.makeSnipersTable());
	}
	fillContentPane(table){
		this.snipers.setTable(table);
		this.snipers.render();
	}
	makeSnipersTable(){
		let snipersTable = this.frame.querySelector('table');
		if(!snipersTable){
			snipersTable = this.frame.appendChild(document.createElement('table'));
			snipersTable.id = 'snipersTable';
			snipersTable.cellspacing = 0;
			snipersTable.style.cssText = 'border:1px solid #000;background:#fff;margin:10px';
			const caption = snipersTable.appendChild(document.createElement('caption'));
			caption.innerHTML = MainWindow.SNIPERS_TABLE_NAME;
		}
		return snipersTable;
	}
	showStatus(status){
		this.snipers.setStatusText(status);
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
		return document.getElementById('snipersTable').innerHTML.includes(statusText);
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