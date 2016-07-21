const Main = class{
	constructor(sniperId){
		this.sniperId = sniperId;
		this.snipers = new Table();
		this.ui = new MainWindow(this.snipers);
		this.addUserRequestListenerFor();
	}
	addUserRequestListenerFor(){
		this.ui.adduserRequestListener(itemId=>{
			this.snipers.addSniper(SniperSnapshot.joining(itemId));
			const chat = Connection.getChatManager().createChat(this.sniperId, itemId);
			const auction = new XMPPAuction(chat);
			chat.addMessageListener(new AuctionMessageTranslator(
				this.sniperId,
				new AuctionSniper(
					itemId,
					auction,
					new SniperDisplayListener(this.snipers)
				)
			));
			auction.join();
		});
	}
};
const Driver = class{
	constructor(main){
		this.main = main;
	}
	startBiddingFor(itemId){
		document.getElementById('itemId').value = itemId;
		document.getElementById('joinAuction').forceClick();
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
		this.sniperId = 'hika';
	}
	startSniper(auctions){
		this.main = new Main(this.sniperId);
		this.driver = new Driver(this.main);	
	}
	startBiddingIn(...auctions){
		this.startSniper();
		auctions.forEach(auction=>{
			const itemId = auction.getItemId();
			this.driver.startBiddingFor(itemId);
			this.driver.showSniperStatus(itemId, 0, 0, SniperState.JOINING);
		});
	}
	showsSniperIsBidding(auction, lastPrice, lastBid){
		return this.driver.showSniperStatus(auction.getItemId(), lastPrice, lastBid, SniperState.BIDDING);
	}
	showsSniperHasLostAuction(auction){
		return this.driver.showSniperStatus(auction.getItemId(), 0, 0, SniperState.LOST);
	}
	showsSniperIsWinning(auction, winningBid){
		return this.driver.showSniperStatus(auction.getItemId(), winningBid, winningBid, SniperState.WINNING);
	}
	showsSniperHasWonAuction(auction, wonBid){
		return this.driver.showSniperStatus(auction.getItemId(), wonBid, wonBid, SniperState.WON);
	}
};
const FakeAuction = class{
	constructor(itemId){
		this.itemId = itemId;
		Object.freeze(this);
	}
	getItemId(){return this.itemId;}
};
const runner = new Runner();
//runner.startBiddingIn(new FakeAuction('item-54321'), new FakeAuction('item-65432'));
