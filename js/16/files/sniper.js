const log =(...arg)=>{
	document.getElementById('result').innerHTML += arg.join(', ') + '<br>';
};
const Connection = class{
	static getChatManager(){
		return new Connection();
	}
	constructor(){
		this.isSending = false;
		this.queue = [];
		this.net = new XMLHttpRequest();
		this.net.onreadystatechange =v=>{
			if(this.net.readyState === 4 && this.net.status === 200){
				this.isSending = false;
				const response = this.net.responseText;
				if(this.listener && response){
					const msg = response.split(',');
					if(msg[0] == this.itemId){
						this.listener.processMessage(msg.slice(1));
					}
				}
			}
		};
	}
	createChat(sniperId, itemId){
		this.sniperId = sniperId;
		this.itemId = itemId;
		this.interval = setInterval(_=>{
			if(this.isSending) return;
			this.net.open('GET', `${this.itemId}/${this.sniperId}/${this.queue.length ? this.queue.pop() : 'polling'}`);
			this.net.send(null);
			this.isSending = true;
		}, 700);
		return this;
	}
	addMessageListener(listener){this.listener = listener;}
	sendMessage(msg){this.queue.push(msg);}
	stop(){clearInterval(this.interval);}		
};

const XMPPAuction = class{
	constructor(chat){this.chat = chat;}
	bid(amount){
		this.sendMessage(`bid/${amount}`);
	}
	join(){this.sendMessage(`join`);}
	sendMessage(msg){this.chat.sendMessage(msg);}
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
		case'price':
			this.listener.currentPrice(
				e.currenPrice, e.increment, e.isFrom(this.sniperId)
			);
			break;
		}
	}
};
const AuctionEvent = class{
	static from(msg){
		const e = new AuctionEvent();
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
		this.listener.sniperStateChange(this.snapshot);
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
