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
		constructor(){
			return new Proxy(this, trap);
		}
		_logger(...arg){
			const key = '_' + this._key;
			if(!this[key]) this[key] = [];
			this[key].push(arg);
			console.log('_l', this._key, key, this[key], this);
		}
	};
	{
		const sniperListener = new Mock();
		const auction = new Mock();
		const sniper = new AuctionSniper(auction, sniperListener);
		bsTest('reportsLostWhenActionCloses',
			_=>{
				sniper.auctionClosed();
				const log = sniperListener._sniperLost;
				console.log(sniperListener);
				return log.length == 1 && log[0].length == 0;
			}, true
		);
		bsTest('bidHigherAndReportsBiddingWhenPriceArrives',
			_=>{
				const price = 1001, increment = 25, bidder = 'some';
				sniper.currentPrice(price, increment, bidder);
				const log0 = auction._bid, log1 = sniperListener._sniperBidding;
				return log0.length == 1 && log0[0][0] == price + increment && 
						log1.length >= 1 && log1[0].length == 0;
			}, true
		);
	}
}
