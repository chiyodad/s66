{
	const trap = {
		get(target, key, trap){
			if(typeof key == 'string' && key != '_key' && key != '_logger' && key[0] != '_'){
				target._key = key;
				return target._logger;
			}else return target[key];
		}
	};
	const Mock = class{
		constructor(states = {}){
			this.__states = states;
			this.__state = '';
			return new Proxy(this, trap);
		}
		_logger(...arg){
			const key = '_' + this._key, state = this.__states[this._key];
			if(!this[key]) this[key] = [];
			if(state) this.__state = state;
			arg.state = this.__state;
			this[key].push(arg);
		}
	};
	{
		const sniperListener = new Mock();
		const auction = new Mock();
		const sniper = new AuctionSniper(auction, sniperListener);
		bsTest('13.reportsLostWhenActionCloses',
			_=>{
				sniper.auctionClosed();
				const log = sniperListener._sniperLost;
				return log.length == 1 && log[0].length == 0;
			}, true
		);
		bsTest('13.bidHigherAndReportsBiddingWhenPriceArrives',
			_=>{
				const price = 1001, increment = 25, bidder = 'some';
				sniper.currentPrice(price, increment, bidder);
				const log0 = auction._bid, log1 = sniperListener._sniperBidding;
				return log0.length == 1 && log0[0][0] == price + increment && 
						log1.length >= 1 && log1[0].length == 0;
			}, true
		);
		bsTest('14.reportIsWinningWhenCurrentPriceComesFromSniper',
			_=>{
				const price = 123, increment = 45, bidder = PriceSource.FromSniper;
				sniper.currentPrice(price, increment, bidder);
				const log = sniperListener._sniperWinning;
				return log.length >= 1 && log[0].length == 0;
			}, true
		);
	}
	{
		const SNIPER_ID = 'hika';
		bsTest('14.notifiesBidDetailsWhenCurrentPriceMessageReceivedFromOtherBidder',
			_=>{
				const listener = new Mock();
				const translator = new AuctionMessageTranslator(SNIPER_ID, listener);
				
				const price = 192, increment = 7, bidder = 'Someone else';
				const message = `price,${price},${increment},${bidder}`;
				translator.processMessage(message);
				const log = listener._currentPrice;
				return log.length == 1 && log[0][0] == price && log[0][1] == increment && 
					log[0][2] == PriceSource.FromOtherBidder;
			}, true
		);
		bsTest('14.notifiesBidDetailsWhenCurrentPriceMessageReceivedFromSniper',
			_=>{
				const listener = new Mock();
				const translator = new AuctionMessageTranslator(SNIPER_ID, listener);
				
				const price = 234, increment = 5, bidder = SNIPER_ID;
				const message = `price,${price},${increment},${bidder}`;
				translator.processMessage(message);
				const log = listener._currentPrice;
				return log.length == 1 && log[0][0] == price && log[0][1] == increment && 
					log[0][2] == PriceSource.FromSniper;
			}, true
		);
	}
	{
		bsTest('14.reportsLostIfAuctionClosesImmediately',
			_=>{
				const sniperListener = new Mock();
				const auction = new Mock();
				const sniper = new AuctionSniper(auction, sniperListener);
				
				sniper.auctionClosed();
				const log = sniperListener._sniperLost;
				return log.length == 1 && log[0].length == 0;
			}, true
		);
		bsTest('14.reportsLostIfAuctionClosesWhenBidding',
			_=>{
				const sniperListener = new Mock({
					sniperBidding:'bidding'
				});
				const auction = new Mock();
				const sniper = new AuctionSniper(auction, sniperListener);
		
				const price = 123, increment = 45, bidder = PriceSource.FromOtherBidder;
				sniper.currentPrice(price, increment, bidder);
				sniper.auctionClosed();
				const log0 = sniperListener._sniperBidding, log1 = sniperListener._sniperLost;
				return log0.length == 1 && log0[0].length == 0 &&
					log1.length >= 1 && log1[0].length == 0 && log1[0].state == 'bidding';
			}, true
		);
		bsTest('14.reportsWonIfAuctionClosesWhenWinning',
			_=>{
				const sniperListener = new Mock({
					sniperWinning:'winning'
				});
				const auction = new Mock();
				const sniper = new AuctionSniper(auction, sniperListener);
		
				const price = 123, increment = 45, bidder = PriceSource.FromSniper;
				sniper.currentPrice(price, increment, bidder);
				sniper.auctionClosed();
				const log0 = sniperListener._sniperWinning, log1 = sniperListener._sniperWon;
				return log0.length == 1 && log0[0].length == 0 &&
					log1.length >= 1 && log1[0].length == 0 && log1[0].state == 'winning';
			}, true
		);
	}
}