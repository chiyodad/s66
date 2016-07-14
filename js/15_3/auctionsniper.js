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
const PriceSource = class{
	static get FromSniper(){return Symbol.for('PriceSource.FromSniper');}
	static get FromOtherBidder(){return Symbol.for('PriceSource.FromOtherBidder');}
};
const SniperState = class{
	static get JOINING(){return new SniperState('join');}
	static get BIDDING(){return new SniperState('bid');}
	static get WINNING(){return new SniperState('win');}
	static get LOST(){return new SniperState('lost');}
	static get WON(){return new SniperState('won');}
	constructor(text){
		this.text = text;
		Object.freeze(this);
	}
	whenAuctionClosed(){
		switch(this.text){
		case'join':case'bid': return SniperState.LOST;
		case'win': return SniperState.WON;
		default:throw 'Auction is already closed';
		}
	}
	[Symbol.toPrimitive](hint){return this.text;}
};
const Column = class{
	static get [0](){return new Column('itemId');}
	static get [1](){return new Column('lastPrice');}
	static get [2](){return new Column('lastBid');}
	static get [3](){return new Column('state');}
	static get length(){return 4;}
	
	constructor(name){
		this.name = name;
		Object.freeze(this);
	}
	valueIn(snapshot){
		return snapshot[this.name];
	}
};
const SniperSnapshot = class{
	static joining(itemId){
		return new SniperSnapshot(itemId, 0, 0, SniperState.JOINING);
	}
	constructor(itemId, lastPrice, lastBid, state){
		this.itemId = itemId;
		this.lastPrice = lastPrice;
		this.lastBid = lastBid;
		this.state = state;
		Object.freeze(this);
	}
	bidding(lastPrice, lastBid){
		return new SniperSnapshot(this.itemId, lastPrice, lastBid, SniperState.BIDDING);
	}
	winning(lastPrice){
		return new SniperSnapshot(this.itemId, lastPrice, this.lastBid, SniperState.WINNING);
	}
	closed(){
		return new SniperSnapshot(this.itemId, this.lastPrice, this.lastBid, this.state.whenAuctionClosed());
	}
	get hash(){
		return `$$sniperState:${this.itemId}:${this.lastPrice}:${this.lastBid}`;
	}
};
const AuctionSniper = class{
	constructor(itemId, auction, sniperListener){
		this.isWinning = false;
		this.auction = auction;
		this.listener = sniperListener;
		this.snapshot = SniperSnapshot.joining(itemId);
		this.notifyChange();
	}
	auctionClosed(){
		this.snapshot = this.snapshot.closed();
		this.notifyChange();
	}
	currentPrice(price, increment, priceSource){
		this.isWinning = priceSource == PriceSource.FromSniper;
		switch(priceSource){
		case PriceSource.FromSniper:
			this.snapshot = this.snapshot.winning(price);
			break;
		case PriceSource.FromOtherBidder:
			const bid = price + increment;
			this.auction.bid(bid);
			this.snapshot = this.snapshot.bidding(price, bid);
			break;
		}
		this.notifyChange();
	}
	notifyChange(){
		console.log('notifyChange',this.snapshot);
		this.listener.sniperStateChange(this.snapshot);
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
		return Column.length;
	}
	getRowCount(){
		return 1;
	}
	getValueAt(rowIndex, columnIndex){
		return Column[columnIndex].valueIn(this.snapshot);
	}
	getColumnName(column){
		return Column[column].name;
	}
	sniperStateChange(snapshot){
		this.snapshot = snapshot;
		this.render();
	}
	setTable(table){
		this.table = table;
	}
	render(){
		if(!this.table) return;
		//clear
		const rows = this.table.querySelectorAll('table>tr');
		let i = rows.length, j;
		while(i--) this.table.removeChild(rows[i]);
		//head설정
		if(!this.table.querySelector('thead')){
			const tr = this.table.appendChild(document.createElement('thead')).appendChild(document.createElement('tr'));
			for(i = 0; i < this.getColumeCount(); i++){	
				const th = tr.appendChild(document.createElement('th'));
				th.style.cssText = 'background:#aaa;color:#fff;width:110px;border-bottom:1px solid #000;border-right:1px solid #000;';
				th.innerHTML = this.getColumnName(i);
			}
		}
		//render
		for(i = 0; i < this.getRowCount(); i++){
			const row = this.table.appendChild(document.createElement('tr'));
			for(j = 0; j < this.getColumeCount(); j++){
				const cell = row.appendChild(document.createElement('td'));
				cell.style.cssText = 'text-align:center;padding:0;border-bottom:1px solid #000;border-right:1px solid #000;'
				cell.innerHTML = this.getValueAt(i, j);
			}
		}
	}
};
const MainWindow = class{
	static get MAIN_WINDOW_NAME(){return '<h1>AuctionSniper</h1>';}
	static get SNIPERS_TABLE_NAME(){return 'SnipersTable';}

	
	constructor(snipers){
		this.snipers = snipers;
		
		this.frame = document.body.appendChild(document.createElement('div'));
		this.frame.style.cssText = 'background:#ff0;border:1px solid #000;border-radius:5px;margin:5px 10px 50px 10px';

		this.title = this.frame.appendChild(document.createElement('div'));
		this.title.innerHTML = MainWindow.MAIN_WINDOW_NAME;
		
		this.fillContentPane(this.makeSnipersTable());
	}
	fillContentPane(table){
		this.snipers.setTable(table);
	}
	makeSnipersTable(){
		let snipersTable = this.frame.querySelector('table');
		if(!snipersTable){
			snipersTable = this.frame.appendChild(document.createElement('table'));
			snipersTable.id = 'snipersTable';
			snipersTable.style.cssText = 'border-spacing:0;border-collapse:separate;padding:0;border-top:1px solid #000;border-left:1px solid #000;background:#fff;margin:10px';
			const caption = snipersTable.appendChild(document.createElement('caption'));
			caption.innerHTML = MainWindow.SNIPERS_TABLE_NAME;
		}
		return snipersTable;
	}
	sniperStateChange(snapshot){
		this.snipers.sniperStateChange(snapshot);
	}
};
const SniperDisplayListener = class{
	constructor(snipers){
		this.snipers = snipers;
	}
	sniperStateChange(snapshot){
		this.snipers.sniperStateChange(snapshot);
	}
};
const Main = class{
	constructor(sniperId, itemId){
		const auction = new XMPPAuction(sniperId, itemId, data=>this.listener.processMessage(data));
		this.snipers = new Table();
		this.ui = new MainWindow(this.snipers);
		this.listener = new AuctionMessageTranslator(
			sniperId,
			new AuctionSniper(
				itemId,
				auction,
				new SniperDisplayListener(this.snipers)
			)
		);
		auction.join();
	}
};
const Driver = class{
	constructor(main){
		this.main = main;
	}
	showSniperStatus(itemId, lastPrice, lastBid, statusText){
		const target = document.getElementById('snipersTable').innerHTML;
		return target.includes(`>${itemId}</`) &&
			target.includes(`>${lastPrice}</`) &&
			target.includes(`>${lastBid}</`) &&
			target.includes(`>${statusText}</`);
	}
};
const Runner = class{
	constructor(){
		this.sniper_id = 'hika';
	}
	startBiddingIn(itemId){
		this.itemId = itemId;
		this.main = new Main(this.sniper_id, itemId);
		this.driver = new Driver(this.main);
		this.driver.showSniperStatus(this.itemId, 0, 0, SniperState.JOINING);
	}
	showsSniperIsBidding(lastPrice, lastBid){
		return this.driver.showSniperStatus(this.itemId, lastPrice, lastBid, SniperState.BIDDING);
	}
	showsSniperHasLostAuction(){
		return this.driver.showSniperStatus(this.itemId, 0, 0, SniperState.LOST);
	}
	showsSniperIsWinning(winningBid){
		return this.driver.showSniperStatus(this.itemId, winningBid, winningBid, SniperState.WINNING);
	}
	showsSniperHasWonAuction(wonBid){
		return this.driver.showSniperStatus(this.itemId, wonBid, wonBid, SniperState.WON);
	}
};
let runner;
/*
runner = new Runner();
runner.startBiddingIn('1234')
*/